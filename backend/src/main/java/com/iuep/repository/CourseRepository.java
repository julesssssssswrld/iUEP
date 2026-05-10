package com.iuep.repository;

import com.iuep.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CourseRepository extends JpaRepository<Course, String> {
    List<Course> findAllByOrderByCollegeAscCourseCodeAsc();
}
