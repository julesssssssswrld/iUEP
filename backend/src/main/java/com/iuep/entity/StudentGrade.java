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

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Column(nullable = false)
    private String grade;

    @Column(nullable = false)
    private String semester;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    /** Year level when this grade was earned (1–5) */
    @Column(name = "year_level", nullable = false)
    private int yearLevel;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStuId() { return stuId; }
    public void setStuId(String stuId) { this.stuId = stuId; }

    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public int getYearLevel() { return yearLevel; }
    public void setYearLevel(int yearLevel) { this.yearLevel = yearLevel; }
}
