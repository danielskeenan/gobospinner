<?php

namespace App\Entity;

use ApiPlatform\Core\Annotation\ApiFilter;
use ApiPlatform\Core\Annotation\ApiResource;
use ApiPlatform\Core\Bridge\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Core\Bridge\Doctrine\Orm\Filter\SearchFilter;
use App\Repository\GoboRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass=GoboRepository::class)
 */
#[ApiResource(
    order: ['manufacturer.name' => 'ASC', 'sortWeight' => 'ASC'],
)]
#[ApiFilter(SearchFilter::class, properties: [
    'manufacturer' => 'exact',
    'material' => 'exact',
    'code' => 'istart',
    'name' => 'ipartial',
])]
#[ApiFilter(OrderFilter::class, properties: [
    'name',
    'sortWeight',
])]
class Gobo
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private ?int $id;

    /**
     * @ORM\ManyToOne(targetEntity=Manufacturer::class)
     * @ORM\JoinColumn(nullable=false)
     */
    private ?Manufacturer $manufacturer;

    /**
     * @ORM\ManyToOne(targetEntity=Material::class)
     * @ORM\JoinColumn(nullable=false)
     */
    private ?Material $material;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private ?string $name;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private ?string $code;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private ?string $imageId;

    /**
     * @ORM\Column(type="integer")
     */
    private int $sortWeight = 0;

    /**
     * @ORM\Column(type="boolean")
     */
    private bool $adjustOpacity = true;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getManufacturer(): ?Manufacturer
    {
        return $this->manufacturer;
    }

    public function setManufacturer(?Manufacturer $manufacturer): self
    {
        $this->manufacturer = $manufacturer;

        return $this;
    }

    public function getMaterial(): ?Material
    {
        return $this->material;
    }

    public function setMaterial(?Material $material): self
    {
        $this->material = $material;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getCode(): ?string
    {
        return $this->code;
    }

    public function setCode(string $code): self
    {
        $this->code = $code;

        return $this;
    }

    public function getImageId(): ?string
    {
        return $this->imageId;
    }

    public function setImageId(string $imageId): self
    {
        $this->imageId = $imageId;

        return $this;
    }

    public function getSortWeight(): int
    {
        return $this->sortWeight;
    }

    public function setSortWeight(int $sortWeight): self
    {
        $this->sortWeight = $sortWeight;

        return $this;
    }

    public function getAdjustOpacity(): bool
    {
        return $this->adjustOpacity;
    }

    public function setAdjustOpacity(bool $adjustOpacity): self
    {
        $this->adjustOpacity = $adjustOpacity;

        return $this;
    }
}
