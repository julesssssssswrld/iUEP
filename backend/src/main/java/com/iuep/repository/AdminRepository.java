package com.iuep.repository;

import com.iuep.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Long> {
    Optional<Admin> findByUsername(String username);
    boolean existsByUsername(String username);
    Optional<Admin> findByUsernameAndIdNot(String username, Long id);
}
