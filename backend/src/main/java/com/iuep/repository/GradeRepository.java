package com.iuep.repository;

import com.iuep.entity.StudentGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface GradeRepository extends JpaRepository<StudentGrade, Long> {

    List<StudentGrade> findByStuIdOrderBySemesterAscSubjectCodeAsc(String stuId);

    List<StudentGrade> findByStuIdAndSemesterAndAcademicYear(String stuId, String semester, String academicYear);

    @Query("SELECT DISTINCT g.semester || ' | ' || g.academicYear FROM StudentGrade g WHERE g.stuId = :stuId ORDER BY g.academicYear DESC, g.semester DESC")
    List<String> findDistinctSemestersByStuId(String stuId);

    boolean existsByStuId(String stuId);
}
