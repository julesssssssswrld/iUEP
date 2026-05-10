package com.iuep.repository;

import com.iuep.entity.FbPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface FbPostRepository extends JpaRepository<FbPost, Long> {
    List<FbPost> findByDepartmentOrderByPostDateDesc(String department);
    List<FbPost> findAllByOrderByPostDateDesc();
    Optional<FbPost> findByFbPostId(String fbPostId);
}
