package com.iuep.repository;

import com.iuep.entity.ScrapeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ScrapeLogRepository extends JpaRepository<ScrapeLog, Long> {
    Optional<ScrapeLog> findFirstByDepartmentAndStatusOrderByScrapedAtDesc(String department, String status);
    List<ScrapeLog> findTop10ByOrderByScrapedAtDesc();
}
