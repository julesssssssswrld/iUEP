package com.iuep.repository;

import com.iuep.entity.IdApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface IdApplicationRepository extends JpaRepository<IdApplication, Long> {

    Optional<IdApplication> findFirstByStudentIdOrderByIdDesc(String studentId);

    List<IdApplication> findByStudentId(String studentId);

    List<IdApplication> findByStatusOrderByIdDesc(String status);

    @Query("SELECT a FROM IdApplication a ORDER BY a.id DESC")
    List<IdApplication> findAllOrderByIdDesc();

    List<IdApplication> findByStatusIn(List<String> statuses);

    @Query("SELECT COUNT(a) FROM IdApplication a")
    long countTotal();

    @Query("SELECT COUNT(a) FROM IdApplication a WHERE a.status IN ('uploaded','received')")
    long countPending();

    @Query("SELECT COUNT(a) FROM IdApplication a WHERE a.status = 'processing'")
    long countProcessing();

    @Query("SELECT COUNT(a) FROM IdApplication a WHERE a.status = 'completed'")
    long countCompleted();

    @Query("SELECT COUNT(a) FROM IdApplication a WHERE a.status = 'claimed'")
    long countClaimed();

    @Query("SELECT COUNT(a) FROM IdApplication a WHERE a.status = 'rejected'")
    long countRejected();
}
