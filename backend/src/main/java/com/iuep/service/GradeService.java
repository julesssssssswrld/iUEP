package com.iuep.service;

import com.iuep.entity.StudentGrade;
import com.iuep.entity.User;
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
     * Returns grades for a student, filtered by year level and/or semester.
     * Also returns metadata for the dropdown controls (available years, semesters,
     * student's current year level for graying logic).
     */
    public Map<String, Object> getGrades(String stuId, Integer yearLevel, String semester) {
        User user = userRepo.findByStuId(stuId)
                .orElseThrow(() -> ApiException.notFound("Student not found."));

        // Resolve the student's current year level from their profile
        int studentYearLevel = parseYearLevel(user.getYearLevel());

        // Fetch grades based on filters
        List<StudentGrade> grades;
        if (yearLevel != null && semester != null) {
            grades = gradeRepo.findByStuIdAndYearLevelAndSemester(stuId, yearLevel, semester);
        } else if (yearLevel != null) {
            grades = gradeRepo.findByStuIdAndYearLevel(stuId, yearLevel);
        } else {
            grades = gradeRepo.findByStuIdOrderByYearLevelAscSemesterAsc(stuId);
        }

        // Build grade list with resolved subject data
        List<Map<String, Object>> gradeList = grades.stream().map(g -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subjectCode", g.getSubject().getSubjectCode());
            m.put("description", g.getSubject().getDescription());
            m.put("grade", g.getGrade());
            m.put("semester", g.getSemester());
            m.put("academicYear", g.getAcademicYear());
            m.put("yearLevel", g.getYearLevel());
            return m;
        }).toList();

        // Build available years this student has grades for
        List<Integer> availableYears = gradeRepo.findDistinctYearLevelsByStuId(stuId);

        // Build available semesters for the selected year (or all if no year selected)
        List<String> availableSemesters;
        if (yearLevel != null) {
            availableSemesters = gradeRepo.findDistinctSemestersByStuIdAndYearLevel(stuId, yearLevel);
        } else if (!availableYears.isEmpty()) {
            // Default: semesters for the student's current year
            availableSemesters = gradeRepo.findDistinctSemestersByStuIdAndYearLevel(stuId, studentYearLevel);
        } else {
            availableSemesters = List.of();
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("grades", gradeList);
        result.put("availableYears", availableYears);
        result.put("availableSemesters", availableSemesters);
        result.put("studentYearLevel", studentYearLevel);
        result.put("studentYearLevelLabel", user.getYearLevel());
        return result;
    }

    /**
     * Parses "1st Year", "2nd Year", etc. into an integer.
     * Returns 1 as default if unparseable.
     */
    static int parseYearLevel(String yearLevel) {
        if (yearLevel == null || yearLevel.isBlank()) return 1;
        String trimmed = yearLevel.trim().toLowerCase();
        if (trimmed.startsWith("1")) return 1;
        if (trimmed.startsWith("2")) return 2;
        if (trimmed.startsWith("3")) return 3;
        if (trimmed.startsWith("4")) return 4;
        if (trimmed.startsWith("5")) return 5;
        // Try extracting a digit
        for (char c : trimmed.toCharArray()) {
            if (Character.isDigit(c)) return Character.getNumericValue(c);
        }
        return 1;
    }
}
