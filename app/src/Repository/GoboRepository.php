<?php

namespace App\Repository;

use App\Entity\Gobo;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method Gobo|null find($id, $lockMode = null, $lockVersion = null)
 * @method Gobo|null findOneBy(array $criteria, array $orderBy = null)
 * @method Gobo[]    findAll()
 * @method Gobo[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class GoboRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Gobo::class);
    }

    // /**
    //  * @return Gobo[] Returns an array of Gobo objects
    //  */
    /*
    public function findByExampleField($value)
    {
        return $this->createQueryBuilder('g')
            ->andWhere('g.exampleField = :val')
            ->setParameter('val', $value)
            ->orderBy('g.id', 'ASC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult()
        ;
    }
    */

    /*
    public function findOneBySomeField($value): ?Gobo
    {
        return $this->createQueryBuilder('g')
            ->andWhere('g.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */
}
