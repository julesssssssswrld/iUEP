package com.iuep.controller;

import com.iuep.service.GradeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/grades")
public class GradeController {

    private final GradeService gradeService;

    public GradeController(GradeService gradeService) {
        this.gradeService = gradeService;
    }

    @GetMapping("/{stuId}")
    public ResponseEntity<?> getGrades(
            @PathVariable String stuId,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String academicYear) {
        return ResponseEntity.ok(gradeService.getGrades(stuId, semester, academicYear));
    }
}
