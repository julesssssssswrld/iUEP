package com.iuep.repository;

import com.iuep.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {
    Optional<OtpCode> findFirstByEmailAndPurposeAndVerifiedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            String email, String purpose, LocalDateTime now);
    void deleteByExpiresAtBefore(LocalDateTime now);

    long countByEmailAndPurposeAndVerifiedFalseAndExpiresAtAfter(
            String email, String purpose, LocalDateTime now);

    List<OtpCode> findAllByEmailAndPurposeAndVerifiedFalse(String email, String purpose);
}
