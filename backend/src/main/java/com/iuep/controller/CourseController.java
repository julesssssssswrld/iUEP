package com.iuep.controller;

import com.iuep.entity.Course;
import com.iuep.exception.GlobalExceptionHandler.ApiException;
import com.iuep.repository.CourseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseRepository courseRepo;

    public CourseController(CourseRepository courseRepo) {
        this.courseRepo = courseRepo;
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(courseRepo.findAllByOrderByCollegeAscCourseCodeAsc());
    }

    @GetMapping("/{code}")
    public ResponseEntity<?> getByCode(@PathVariable String code) {
        Course course = courseRepo.findById(code.toUpperCase())
                .orElseThrow(() -> ApiException.notFound("Course not found"));
        return ResponseEntity.ok(course);
    }
}
