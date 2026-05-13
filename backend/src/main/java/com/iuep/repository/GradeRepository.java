package com.iuep.repository;

import com.iuep.entity.StudentGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface GradeRepository extends JpaRepository<StudentGrade, Long> {

    List<StudentGrade> findByStuIdOrderByYearLevelAscSemesterAsc(String stuId);

    List<StudentGrade> findByStuIdAndYearLevelAndSemester(String stuId, int yearLevel, String semester);

    List<StudentGrade> findByStuIdAndYearLevel(String stuId, int yearLevel);

    @Query("SELECT DISTINCT g.yearLevel FROM StudentGrade g WHERE g.stuId = :stuId ORDER BY g.yearLevel ASC")
    List<Integer> findDistinctYearLevelsByStuId(String stuId);

    @Query("SELECT DISTINCT g.semester FROM StudentGrade g WHERE g.stuId = :stuId AND g.yearLevel = :yearLevel ORDER BY g.semester ASC")
    List<String> findDistinctSemestersByStuIdAndYearLevel(String stuId, int yearLevel);

    @Query("SELECT DISTINCT g.academicYear FROM StudentGrade g WHERE g.stuId = :stuId ORDER BY g.academicYear DESC")
    List<String> findDistinctAcademicYearsByStuId(String stuId);

    boolean existsByStuId(String stuId);

    void deleteAllByStuId(String stuId);
}
