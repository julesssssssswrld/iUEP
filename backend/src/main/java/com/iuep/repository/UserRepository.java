package com.iuep.repository;

import com.iuep.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByStuId(String stuId);
    Optional<User> findByUsername(String username);
    boolean existsByStuId(String stuId);
    boolean existsByUsername(String username);
    Optional<User> findByUsernameAndStuIdNot(String username, String stuId);
}
