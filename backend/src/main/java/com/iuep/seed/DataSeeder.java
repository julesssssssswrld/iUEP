package com.iuep.seed;

import com.iuep.entity.Admin;
import com.iuep.entity.Course;
import com.iuep.entity.StudentGrade;
import com.iuep.entity.User;
import com.iuep.repository.AdminRepository;
import com.iuep.repository.CourseRepository;
import com.iuep.repository.GradeRepository;
import com.iuep.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private final AdminRepository adminRepo;
    private final CourseRepository courseRepo;
    private final UserRepository userRepo;
    private final GradeRepository gradeRepo;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(AdminRepository adminRepo, CourseRepository courseRepo,
                      UserRepository userRepo, GradeRepository gradeRepo,
                      PasswordEncoder passwordEncoder) {
        this.adminRepo = adminRepo;
        this.courseRepo = courseRepo;
        this.userRepo = userRepo;
        this.gradeRepo = gradeRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedAdmin();
        seedCourses();
        seedGrades();
    }

    private void seedAdmin() {
        if (adminRepo.count() == 0) {
            log.info("[Seeder] Seeding default admin account...");
            Admin admin = new Admin();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setDisplayName("ID Office Admin");
            admin.setRole("id_production");
            adminRepo.save(admin);
        }
    }

    private void seedCourses() {
        if (courseRepo.count() > 0) return;
        log.info("[Seeder] Seeding course data...");

        sc("BSBIO","BS in Biology","COLLEGE OF SCIENCE");
        sc("BSCHEM","BS in Chemistry","COLLEGE OF SCIENCE");
        sc("BSES","BS in Environmental Science","COLLEGE OF SCIENCE");
        sc("BSIT","BS in Information Technology","COLLEGE OF SCIENCE");
        sc("BSMBIO","BS in Marine Biology","COLLEGE OF SCIENCE");
        sc("BSMATH","BS in Mathematics","COLLEGE OF SCIENCE");
        sc("BSABE","BS in Agricultural and Biosystems Engineering","COLLEGE OF ENGINEERING");
        sc("BSCE","BS in Civil Engineering","COLLEGE OF ENGINEERING");
        sc("BSEE","BS in Electrical Engineering","COLLEGE OF ENGINEERING");
        sc("BSME","BS in Mechanical Engineering","COLLEGE OF ENGINEERING");
        sc("BET","Bachelor of Engineering Technology","COLLEGE OF ENGINEERING");
        sc("BSN","BS in Nursing","COLLEGE OF NURSING AND ALLIED HEALTH SERVICES");
        sc("BSRT","BS in Radiologic Technology","COLLEGE OF NURSING AND ALLIED HEALTH SERVICES");
        sc("BSCRIM","BS in Criminology","COLLEGE OF CRIMINAL JUSTICE");
        sc("BSA","BS in Accountancy","COLLEGE OF BUSINESS ADMINISTRATION");
        sc("BSENTREP","BS in Entrepreneurship","COLLEGE OF BUSINESS ADMINISTRATION");
        sc("BSHM","BS in Hospitality Management","COLLEGE OF BUSINESS ADMINISTRATION");
        sc("BSBA","BS in Business Administration","COLLEGE OF BUSINESS ADMINISTRATION");
        sc("BEED","Bachelor of Elementary Education","COLLEGE OF EDUCATION");
        sc("BPED","Bachelor of Physical Education","COLLEGE OF EDUCATION");
        sc("BSED","BS in Secondary Education","COLLEGE OF EDUCATION");
        sc("BTLED","Bachelor of Technology and Livelihood Education","COLLEGE OF EDUCATION");
        sc("BAEL","BA in English Language","COLLEGE OF ARTS AND COMMUNICATION");
        sc("BAL","BA in Literature","COLLEGE OF ARTS AND COMMUNICATION");
        sc("BAPS","BA in Political Science","COLLEGE OF ARTS AND COMMUNICATION");
        sc("BAPA","BA in Public Administration","COLLEGE OF ARTS AND COMMUNICATION");
        sc("BAS","BA in Sociology","COLLEGE OF ARTS AND COMMUNICATION");
        sc("BSCD","BS in Community Development","COLLEGE OF ARTS AND COMMUNICATION");
        sc("BSDC","BS in Development Communication","COLLEGE OF ARTS AND COMMUNICATION");
        sc("DVM","Doctor of Veterinary Medicine","COLLEGE OF VETERINARY MEDICINE");
        sc("BSMT","BS in Medical Technology","COLLEGE OF VETERINARY MEDICINE");
        sc("BSAGRI","BS in Agriculture","COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES");
        sc("BSAGED","BS in Agricultural Education","COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES");
        sc("BSAG","BS in Agribusiness","COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES");
        sc("BSF","BS in Fisheries","COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES");
        sc("BSFOR","BS in Forestry","COLLEGE OF AGRICULTURE, FISHERIES AND NATURAL RESOURCES");
    }

    private void sc(String code, String name, String college) {
        Course c = new Course();
        c.setCourseCode(code);
        c.setCourseName(name);
        c.setCollege(college);
        courseRepo.save(c);
    }

    /* ────────────────────────────────────────────────────────
     *  Grade Seeding — realistic subjects per course
     * ──────────────────────────────────────────────────────── */

    private void seedGrades() {
        // Only seed if no grades exist yet
        List<User> allUsers = userRepo.findAll();
        if (allUsers.isEmpty()) return;

        // Check if we already seeded grades for any user
        boolean anySeeded = allUsers.stream().anyMatch(u -> gradeRepo.existsByStuId(u.getStuId()));
        if (anySeeded) return;

        log.info("[Seeder] Seeding grade data for {} students...", allUsers.size());

        Random rng = new Random(42); // fixed seed for reproducible data

        for (User user : allUsers) {
            String course = user.getCourse() != null ? user.getCourse().toUpperCase() : "";
            String yearLevel = user.getYearLevel() != null ? user.getYearLevel() : "2nd Year";

            // Determine which subject sets to use
            List<String[]> firstSem = getSubjectsForSemester(course, yearLevel, "1st Semester");
            List<String[]> secondSem = getSubjectsForSemester(course, yearLevel, "2nd Semester");

            // Seed 1st semester grades
            for (String[] subj : firstSem) {
                saveGrade(user.getStuId(), subj[0], subj[1], randomGrade(rng), "1st Semester", "2025-2026");
            }

            // Seed 2nd semester grades
            for (String[] subj : secondSem) {
                saveGrade(user.getStuId(), subj[0], subj[1], randomGrade(rng), "2nd Semester", "2025-2026");
            }
        }

        log.info("[Seeder] Grade seeding complete.");
    }

    private void saveGrade(String stuId, String code, String desc, String grade, String semester, String ay) {
        StudentGrade g = new StudentGrade();
        g.setStuId(stuId);
        g.setSubjectCode(code);
        g.setDescription(desc);
        g.setGrade(grade);
        g.setSemester(semester);
        g.setAcademicYear(ay);
        gradeRepo.save(g);
    }

    private String randomGrade(Random rng) {
        // Weighted distribution: mostly passing grades, rare INC/DRP
        String[] pool = {
            "1.00", "1.00", "1.25", "1.25", "1.25",
            "1.50", "1.50", "1.50", "1.75", "1.75",
            "1.75", "2.00", "2.00", "2.00", "2.25",
            "2.25", "2.50", "2.50", "2.75", "3.00",
            "INC", "DRP"
        };
        return pool[rng.nextInt(pool.length)];
    }

    /**
     * Returns a list of [subjectCode, description] pairs appropriate
     * for the student's course program and year level.
     */
    private List<String[]> getSubjectsForSemester(String course, String yearLevel, String semester) {
        List<String[]> subjects = new ArrayList<>();

        // Add GE (general education) subjects common to all programs
        if ("1st Semester".equals(semester)) {
            subjects.add(new String[]{"GE 1", "Understanding the Self"});
            subjects.add(new String[]{"GE 3", "The Contemporary World"});
            subjects.add(new String[]{"PE 1", "PATHFit 1"});
            subjects.add(new String[]{"NSTP 1", "National Service Training Program 1"});
        } else {
            subjects.add(new String[]{"GE 2", "Readings in Philippine History"});
            subjects.add(new String[]{"GE 4", "Mathematics in the Modern World"});
            subjects.add(new String[]{"PE 2", "PATHFit 2"});
            subjects.add(new String[]{"NSTP 2", "National Service Training Program 2"});
        }

        // Add major/professional subjects based on course
        switch (course) {
            case "BSIT":
                addBsitSubjects(subjects, yearLevel, semester);
                break;
            case "BSCE":
                addBsceSubjects(subjects, yearLevel, semester);
                break;
            case "BSN":
                addBsnSubjects(subjects, yearLevel, semester);
                break;
            case "BSCRIM":
                addBscrimSubjects(subjects, yearLevel, semester);
                break;
            case "BSBA": case "BSA": case "BSENTREP":
                addBusinessSubjects(subjects, yearLevel, semester);
                break;
            case "BEED": case "BSED": case "BPED":
                addEducationSubjects(subjects, yearLevel, semester);
                break;
            case "BSEE": case "BSME": case "BSABE": case "BET":
                addEngineeringSubjects(subjects, yearLevel, semester);
                break;
            default:
                // Generic science/arts subjects for any unlisted course
                addGenericSubjects(subjects, yearLevel, semester);
                break;
        }

        return subjects;
    }

    // ── BSIT subjects ──

    private void addBsitSubjects(List<String[]> list, String yearLevel, String semester) {
        if ("1st Semester".equals(semester)) {
            list.add(new String[]{"CC101", "Introduction to Computing"});
            list.add(new String[]{"CC102", "Computer Programming 1"});
            list.add(new String[]{"IT101", "IT Fundamentals"});
            list.add(new String[]{"MS101", "Discrete Mathematics"});
        } else {
            list.add(new String[]{"CC103", "Computer Programming 2"});
            list.add(new String[]{"CC104", "Data Structures and Algorithms"});
            list.add(new String[]{"PT101", "Platform Technologies"});
            list.add(new String[]{"HCI101", "Human Computer Interaction 1"});
        }
    }

    // ── BSCE subjects ──

    private void addBsceSubjects(List<String[]> list, String yearLevel, String semester) {
        if ("1st Semester".equals(semester)) {
            list.add(new String[]{"CE101", "Engineering Drawing"});
            list.add(new String[]{"MATH101", "Calculus 1"});
            list.add(new String[]{"PHYS101", "Physics for Engineers 1"});
            list.add(new String[]{"CHEM101", "General Chemistry"});
        } else {
            list.add(new String[]{"CE102", "Engineering Mechanics: Statics"});
            list.add(new String[]{"MATH102", "Calculus 2"});
            list.add(new String[]{"PHYS102", "Physics for Engineers 2"});
            list.add(new String[]{"CE103", "Surveying 1"});
        }
    }

    // ── BSN subjects ──

    private void addBsnSubjects(List<String[]> list, String yearLevel, String semester) {
        if ("1st Semester".equals(semester)) {
            list.add(new String[]{"NUR101", "Fundamentals of Nursing 1"});
            list.add(new String[]{"ANAT101", "Anatomy and Physiology 1"});
            list.add(new String[]{"MICRO101", "Microbiology and Parasitology"});
            list.add(new String[]{"CHEM101", "Biochemistry"});
        } else {
            list.add(new String[]{"NUR102", "Fundamentals of Nursing 2"});
            list.add(new String[]{"ANAT102", "Anatomy and Physiology 2"});
            list.add(new String[]{"PHARM101", "Pharmacology"});
            list.add(new String[]{"NUR103", "Health Assessment"});
        }
    }

    // ── BSCRIM subjects ──

    private void addBscrimSubjects(List<String[]> list, String yearLevel, String semester) {
        if ("1st Semester".equals(semester)) {
            list.add(new String[]{"CRIM101", "Introduction to Criminology"});
            list.add(new String[]{"CRIM102", "Criminal Law 1 (RPC Book 1)"});
            list.add(new String[]{"CRIM103", "Law Enforcement Administration"});
            list.add(new String[]{"SOC101", "Introduction to Sociology"});
        } else {
            list.add(new String[]{"CRIM104", "Criminal Law 2 (RPC Book 2)"});
            list.add(new String[]{"CRIM105", "Criminalistics 1"});
            list.add(new String[]{"CRIM106", "Crime Detection and Investigation"});
            list.add(new String[]{"CRIM107", "Correctional Administration"});
        }
    }

    // ── Business subjects (BSBA, BSA, BSENTREP) ──

    private void addBusinessSubjects(List<String[]> list, String yearLevel, String semester) {
        if ("1st Semester".equals(semester)) {
            list.add(new String[]{"ACC101", "Financial Accounting 1"});
            list.add(new String[]{"MGT101", "Principles of Management"});
            list.add(new String[]{"ECON101", "Microeconomics"});
            list.add(new String[]{"BUS101", "Business Mathematics"});
        } else {
            list.add(new String[]{"ACC102", "Financial Accounting 2"});
            list.add(new String[]{"MKT101", "Principles of Marketing"});
            list.add(new String[]{"ECON102", "Macroeconomics"});
            list.add(new String[]{"BUS102", "Business Law and Ethics"});
        }
    }

    // ── Education subjects (BEED, BSED, BPED) ──

    private void addEducationSubjects(List<String[]> list, String yearLevel, String semester) {
        if ("1st Semester".equals(semester)) {
            list.add(new String[]{"ED101", "The Child and Adolescent Learner"});
            list.add(new String[]{"ED102", "The Teaching Profession"});
            list.add(new String[]{"ED103", "Facilitating Learner-Centered Teaching"});
            list.add(new String[]{"FIL101", "Komunikasyon sa Akademikong Filipino"});
        } else {
            list.add(new String[]{"ED104", "Technology for Teaching and Learning 1"});
            list.add(new String[]{"ED105", "Assessment in Learning 1"});
            list.add(new String[]{"ED106", "Foundation of Education"});
            list.add(new String[]{"ED107", "The Teacher and the Community"});
        }
    }

    // ── Engineering subjects (BSEE, BSME, BSABE, BET) ──

    private void addEngineeringSubjects(List<String[]> list, String yearLevel, String semester) {
        if ("1st Semester".equals(semester)) {
            list.add(new String[]{"MATH101", "Calculus 1"});
            list.add(new String[]{"PHYS101", "Physics for Engineers 1"});
            list.add(new String[]{"CHEM101", "General Chemistry for Engineers"});
            list.add(new String[]{"ENGR101", "Engineering Drawing and Graphics"});
        } else {
            list.add(new String[]{"MATH102", "Calculus 2"});
            list.add(new String[]{"PHYS102", "Physics for Engineers 2"});
            list.add(new String[]{"ENGR102", "Computer Fundamentals and Programming"});
            list.add(new String[]{"ENGR103", "Engineering Mechanics"});
        }
    }

    // ── Generic subjects for unlisted courses ──

    private void addGenericSubjects(List<String[]> list, String yearLevel, String semester) {
        if ("1st Semester".equals(semester)) {
            list.add(new String[]{"SCI101", "General Biology"});
            list.add(new String[]{"ENG101", "Technical Writing"});
            list.add(new String[]{"FIL101", "Komunikasyon sa Akademikong Filipino"});
            list.add(new String[]{"SOC101", "Society and Culture"});
        } else {
            list.add(new String[]{"SCI102", "General Chemistry"});
            list.add(new String[]{"ENG102", "Literature"});
            list.add(new String[]{"FIL102", "Pagbasa at Pagsulat"});
            list.add(new String[]{"STAT101", "Elementary Statistics"});
        }
    }
}
