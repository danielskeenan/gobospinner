<?php

namespace App\Command;

use App\Entity\Gobo;
use App\Entity\Manufacturer;
use App\Entity\Material;
use Doctrine\ORM\EntityManagerInterface;
use Ds\Map;
use League\Csv\Exception;
use League\Csv\Reader;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\ProgressBar;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Load data from CSV file
 */
#[AsCommand(
    name: 'app:load-data',
    description: 'Load data from CSV file',
)]
class LoadDataCommand extends Command
{
    private const MANU_APOLLO = 1;
    private const MANU_GAM = 2;
    private const MANU_ROSCO = 3;

    private const MATERIAL_STEEL = 1;
    private const MATERIAL_GLASS = 2;
    private const MATERIAL_SLIDES = 3;
    private const MATERIAL_EFFECTS = 4;

    public function __construct(private EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('source', InputArgument::REQUIRED, 'Source CSV file')
            ->addArgument('images-path', InputArgument::REQUIRED, 'Path to place extracted images');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $sourcePath = $input->getArgument('source');
        $imagesPath = $input->getArgument('images-path');

        // Verify paths
        try {
            $source = Reader::createFromPath($sourcePath, 'r');
        } catch (\Exception $e) {
            $io->error('Source path could not be opened.');

            return Command::FAILURE;
        }
        if (!is_dir($imagesPath) && !mkdir($imagesPath, 0755, recursive: true)) {
            $io->error('Could not create images output directory.');

            return Command::FAILURE;
        }

        // Load data
        $manufacturersMap = $this->loadManufacturers();
        $materialsMap = $this->loadMaterials();
        $progressBar = new ProgressBar($output);
        $progressBar->setFormat(ProgressBar::FORMAT_DEBUG);
        try {
            $this->loadGobos(
                source: $source,
                imagesPath: $imagesPath,
                manufacturers: $manufacturersMap,
                materials: $materialsMap,
                progress: $progressBar
            );
        } catch (Exception $e) {
            $io->error('An error occurred migrating data: '.$e->getMessage());

            return Command::FAILURE;
        }

        // Cleanup the database file
        if ($this->em->getConnection()->getDatabasePlatform()->getName() === 'sqlite') {
            $this->em->getConnection()->executeStatement('VACUUM;');
        }

        $io->newLine(2);

        return Command::SUCCESS;
    }

    /**
     * Load manufacturers.
     *
     * @return Map Manufacturer ids => entities
     */
    private function loadManufacturers(): Map
    {
        $manufacturers = new Map();
        $manufacturers[self::MANU_APOLLO] = (new Manufacturer())->setName("Apollo");
        $manufacturers[self::MANU_GAM] = (new Manufacturer())->setName("GAM");
        $manufacturers[self::MANU_ROSCO] = (new Manufacturer())->setName("Rosco");

        foreach ($manufacturers as $manufacturer) {
            $this->em->persist($manufacturer);
        }
        $this->em->flush();

        return $manufacturers;
    }

    /**
     * Load materials.
     *
     * @return Map Material ids => entities
     */
    private function loadMaterials(): Map
    {
        $materials = new Map();
        $materials[self::MATERIAL_STEEL] = (new Material())->setName("Steel");
        $materials[self::MATERIAL_GLASS] = (new Material())->setName("Glass");
        // Skip slides
        // $materials[self::MATERIAL_SLIDES] = (new Material())->setName("Slides");
        $materials[self::MATERIAL_EFFECTS] = (new Material())->setName("Effects");

        foreach ($materials as $material) {
            $this->em->persist($material);
        }
        $this->em->flush();

        return $materials;
    }

    /**
     * Load gobos from CSV source
     *
     * @param Reader $source
     * @param string $imagesPath
     * @param Map $manufacturers
     * @param Map $materials
     * @param ProgressBar $progress
     *
     * @throws \League\Csv\Exception When the data is invalid
     */
    private function loadGobos(
        Reader $source,
        string $imagesPath,
        Map $manufacturers,
        Map $materials,
        ProgressBar $progress
    ): void {
        $source->setHeaderOffset(0);
        $progress->setMaxSteps($source->count());
        $progress->setProgress(0);
        foreach ($source as $row) {
            $unusedSeries = !$manufacturers->hasKey((int)$row['series_id']);
            $unusedMaterial = !$materials->hasKey((int)$row['material_id']);
            // Apollo recoded their gobos.
            $unusedCode = (int)$row['series_id'] === self::MANU_APOLLO && substr($row['code'], 0, 2) === 'MS';
            if (empty($row['image']) || $unusedSeries || $unusedMaterial || $unusedCode) {
                $progress->advance();
                continue;
            }
            $gobo = $this->goboFromRow($row, $manufacturers, $materials);
            $punchout = false;
            $gobo->setImageId($this->extractImageFromRow($row, $imagesPath, $punchout))->setAdjustOpacity(!$punchout);

            $this->em->persist($gobo);
            $progress->advance();
            if ($progress->getProgress() % 100 === 0) {
                // Flush every 100 rows
                $this->em->flush();
            }
        }
        $this->em->flush();
        $progress->finish();
    }

    /**
     * @param array $row
     * @param Map $manufacturers
     * @param Map $materials
     *
     * @return Gobo
     */
    private function goboFromRow(array $row, Map $manufacturers, Map $materials): Gobo
    {
        $gobo = new Gobo();
        $gobo->setManufacturer($manufacturers[(int)$row['series_id']])
            ->setMaterial($materials[(int)$row['material_id']])
            ->setName($row['name'])
            ->setCode($row['code'])
            ->setSortWeight($row['weight_code']);

        return $gobo;
    }

    /**
     * Extract the image data to a file
     *
     * @param array $row
     * @param string $imagesPath
     * @param bool $punchout Upon return, this method will set this variable to `true` if the gobo has had portions of
     *  image "punched out" (i.e. made transparent), or `false` if not.
     *
     * @return string The file id
     */
    private function extractImageFromRow(array $row, string $imagesPath, bool &$punchout): string
    {
        $filename = sha1($row['image']);
        $filePath = "$imagesPath/$filename.png";
        if (is_file($filePath)) {
            // File has been processed already.
            return $filename;
        }

        // Load image
        $sourceImage = imagecreatefromstring(base64_decode($row['image']));
        $width = imagesx($sourceImage);
        $height = imagesy($sourceImage);
        $image = imagecreatetruecolor($width, $height);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagecopy($image, $sourceImage, 0, 0, 0, 0, $width, $height);

        if ((int)$row['material_id'] === self::MATERIAL_STEEL && self::isGrayscale($image)) {
            // "Punch out" (i.e. replace with transparency) white sections
            $punchout = true;
            for ($x = 0; $x < $width; ++$x) {
                for ($y = 0; $y < $height; ++$y) {
                    [$r, $g, $b, $a] = self::imageRgba($image, $x, $y);

                    // Use the distance from black and the original transparency value as the new transparency value.
                    // GD's alpha channel is only 7 bits wide.
                    $averageIntensity = ((int)round((($r + $g + $b) / 3.0))) >> 1;
                    // Using the original transparency value allows for openings on the edge of the gobo image.
                    $newTransparency = min(127, $averageIntensity + $a);
                    if ($newTransparency !== $a) {
                        $newColor = imagecolorallocatealpha($image, $r, $g, $b, $newTransparency);
                        imagesetpixel($image, $x, $y, $newColor);
                    }
                }
            }
        } else {
            $punchout = false;
        }

        // Save image
        imagepng($image, $filePath);

        return $filename;
    }

    /**
     * Determine if an image is grayscale.
     *
     * @param \GdImage $image
     *
     * @return bool
     */
    private static function isGrayscale(\GdImage $image): bool
    {
        static $maxDiff = 3;

        $width = imagesx($image);
        $height = imagesy($image);
        for ($x = 0; $x < $width; ++$x) {
            for ($y = 0; $y < $height; ++$y) {
                // Get pixel color
                [$r, $g, $b, $a] = self::imageRgba($image, $x, $y);
                if ($a >= 120) {
                    // Transparent pixel; color info is useless.
                    continue;
                }

                // Determine if this pixel is a gray.  Allow a small amount of deviation in colors to account for
                // compression artifacts.
                $diff = max($r, $g, $b) - min($r, $g, $b);
                if ($diff > $maxDiff) {
                    // Not grayscale
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Get pixel color
     *
     * @param \GdImage $image
     * @param int $x
     * @param int $y
     *
     * @return array{0: positive-int, 1: positive-int, 2: positive-int, 3: positive-int}
     */
    private static function imageRgba(\GdImage $image, int $x, int $y): array
    {
        $rgba = imagecolorat($image, $x, $y);
        $r = ($rgba & (0xFF << 0)) >> 0;
        $g = ($rgba & (0xFF << 8)) >> 8;
        $b = ($rgba & (0xFF << 16)) >> 16;
        // Alpha is only 7-bit.
        $a = ($rgba & (0x7F << 24)) >> 24;

        return [$r, $g, $b, $a];
    }
}
