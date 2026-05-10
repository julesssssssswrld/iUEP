package com.iuep.service;

import com.iuep.entity.StudentGrade;
import com.iuep.exception.GlobalExceptionHandler.ApiException;
import com.iuep.repository.GradeRepository;
import com.iuep.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GradeService {

    private final GradeRepository gradeRepo;
    private final UserRepository userRepo;

    public GradeService(GradeRepository gradeRepo, UserRepository userRepo) {
        this.gradeRepo = gradeRepo;
        this.userRepo = userRepo;
    }

    /**
     * Returns all grades for a student, optionally filtered by semester/AY.
     */
    public Map<String, Object> getGrades(String stuId, String semester, String academicYear) {
        userRepo.findByStuId(stuId)
                .orElseThrow(() -> ApiException.notFound("Student not found."));

        List<StudentGrade> grades;
        if (semester != null && academicYear != null) {
            grades = gradeRepo.findByStuIdAndSemesterAndAcademicYear(stuId, semester, academicYear);
        } else {
            grades = gradeRepo.findByStuIdOrderBySemesterAscSubjectCodeAsc(stuId);
        }

        // Build available semesters for the dropdown
        List<String> semesters = gradeRepo.findDistinctSemestersByStuId(stuId);

        List<Map<String, String>> gradeList = grades.stream().map(g -> {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("subjectCode", g.getSubjectCode());
            m.put("description", g.getDescription());
            m.put("grade", g.getGrade());
            m.put("semester", g.getSemester());
            m.put("academicYear", g.getAcademicYear());
            return m;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("grades", gradeList);
        result.put("semesters", semesters);
        return result;
    }
}
