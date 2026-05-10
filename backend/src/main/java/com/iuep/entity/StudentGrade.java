package com.iuep.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "student_grades")
public class StudentGrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stu_id", nullable = false)
    private String stuId;

    @Column(name = "subject_code", nullable = false)
    private String subjectCode;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String grade;

    @Column(nullable = false)
    private String semester;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStuId() { return stuId; }
    public void setStuId(String stuId) { this.stuId = stuId; }

    public String getSubjectCode() { return subjectCode; }
    public void setSubjectCode(String subjectCode) { this.subjectCode = subjectCode; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
}
