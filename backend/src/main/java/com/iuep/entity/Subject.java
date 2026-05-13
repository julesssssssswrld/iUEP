package com.iuep.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "subjects", uniqueConstraints = @UniqueConstraint(columnNames = "subject_code"))
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subject_code", nullable = false, unique = true)
    private String subjectCode;

    @Column(nullable = false)
    private String description;

    public Subject() {}

    public Subject(String subjectCode, String description) {
        this.subjectCode = subjectCode;
        this.description = description;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSubjectCode() { return subjectCode; }
    public void setSubjectCode(String subjectCode) { this.subjectCode = subjectCode; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
