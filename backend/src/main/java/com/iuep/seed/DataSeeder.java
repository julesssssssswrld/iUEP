package com.iuep.seed;

import com.iuep.entity.*;
import com.iuep.repository.*;
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
    private final SubjectRepository subjectRepo;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(AdminRepository adminRepo, CourseRepository courseRepo,
                      UserRepository userRepo, GradeRepository gradeRepo,
                      SubjectRepository subjectRepo, PasswordEncoder passwordEncoder) {
        this.adminRepo = adminRepo;
        this.courseRepo = courseRepo;
        this.userRepo = userRepo;
        this.gradeRepo = gradeRepo;
        this.subjectRepo = subjectRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedDemoUsers();
        seedCourses();
        seedSubjects();
        seedGrades();
    }

    private void seedDemoUsers() {
        if (userRepo.count() > 0) return;
        log.info("[Seeder] Seeding demo users...");

        seedUser("240475", "Jules Ian", "Cajandab", "Tomacas", "BSIT", "2", "C", "2006-06-08", "tomacasjulesiancajandab@gmail.com");
        seedUser("235828", "Kent Jeanne", "Saradogan", "De Leon", "BSIT", "2", "C", "2000-11-21", "lampake000@gmail.com");
        seedUser("244556", "Keniel Drew", "Dimaculangan", "De Asis", "BSIT", "2", "C", "2005-12-20", "kenielddeasis@gmail.com");
        seedUser("244530", "Jovan", "Pabia", "Atencio", "BSIT", "2", "C", "2006-02-05", "jovanatencio17@gmail.com");
        seedUser("240456", "Jose Manuel", "Morado", "Cardeño", "BSIT", "2", "C", "2006-09-23", "jmcardeno706@gmail.com");

        // Seed admin alongside users
        seedAdmin();
    }

    private void seedUser(String stuId, String first, String middle, String last,
                          String course, String year, String section, String birthday, String email) {
        User u = new User();
        u.setStuId(stuId);
        u.setFirstName(first);
        u.setMiddleName(middle);
        u.setLastName(last);
        u.setCourse(course);
        u.setYearLevel(year);
        u.setSection(section);
        u.setBirthday(birthday);
        u.setEmail(email);
        userRepo.save(u);
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

    // ── Subject Seeding ──

    private void seedSubjects() {
        if (subjectRepo.count() > 0) return;
        log.info("[Seeder] Seeding subject catalog...");
        // GE subjects
        ss("GE 1","Understanding the Self"); ss("GE 2","Readings in Philippine History");
        ss("GE 3","The Contemporary World"); ss("GE 4","Mathematics in the Modern World");
        ss("GE 5","Purposive Communication"); ss("GE 6","Art Appreciation");
        ss("GE 7","Science, Technology and Society"); ss("GE 8","Ethics");
        ss("PE 1","PATHFit 1"); ss("PE 2","PATHFit 2"); ss("PE 3","PATHFit 3"); ss("PE 4","PATHFit 4");
        ss("NSTP 1","National Service Training Program 1"); ss("NSTP 2","National Service Training Program 2");
        ss("FIL101","Komunikasyon sa Akademikong Filipino"); ss("FIL102","Pagbasa at Pagsulat");
        // BSIT
        ss("CC101","Introduction to Computing"); ss("CC102","Computer Programming 1");
        ss("IT101","IT Fundamentals"); ss("MS101","Discrete Mathematics");
        ss("CC103","Computer Programming 2"); ss("CC104","Data Structures and Algorithms");
        ss("PT101","Platform Technologies"); ss("HCI101","Human Computer Interaction 1");
        ss("IT201","Information Management"); ss("IT202","Networking 1");
        ss("CC105","Object-Oriented Programming"); ss("WD101","Web Development");
        ss("IT203","Networking 2"); ss("IT204","Systems Integration and Architecture");
        ss("SE101","Software Engineering"); ss("IT205","Web Systems and Technologies");
        ss("IT301","Capstone Project 1"); ss("IT302","Systems Administration");
        ss("IT303","Information Assurance and Security"); ss("IT304","Multimedia Systems");
        ss("IT305","Capstone Project 2"); ss("IT306","Practicum");
        // Engineering
        ss("CE101","Engineering Drawing"); ss("MATH101","Calculus 1");
        ss("PHYS101","Physics for Engineers 1"); ss("CHEM101","General Chemistry");
        ss("CE102","Engineering Mechanics: Statics"); ss("MATH102","Calculus 2");
        ss("PHYS102","Physics for Engineers 2"); ss("CE103","Surveying 1");
        ss("MATH201","Differential Equations"); ss("CE201","Strength of Materials");
        ss("CE202","Fluid Mechanics"); ss("CE203","Surveying 2");
        ss("CE301","Structural Analysis"); ss("CE302","Geotechnical Engineering");
        ss("ENGR101","Engineering Drawing and Graphics"); ss("ENGR102","Computer Fundamentals and Programming");
        ss("ENGR103","Engineering Mechanics");
        // BSN
        ss("NUR101","Fundamentals of Nursing 1"); ss("ANAT101","Anatomy and Physiology 1");
        ss("MICRO101","Microbiology and Parasitology"); ss("NUR102","Fundamentals of Nursing 2");
        ss("ANAT102","Anatomy and Physiology 2"); ss("PHARM101","Pharmacology");
        ss("NUR103","Health Assessment"); ss("NUR201","Medical-Surgical Nursing 1");
        ss("NUR202","Maternal and Child Nursing"); ss("NUR203","Community Health Nursing 1");
        ss("NUR301","Medical-Surgical Nursing 2"); ss("NUR302","Mental Health Nursing");
        // Criminology
        ss("CRIM101","Introduction to Criminology"); ss("CRIM102","Criminal Law 1 (RPC Book 1)");
        ss("CRIM103","Law Enforcement Administration"); ss("SOC101","Introduction to Sociology");
        ss("CRIM104","Criminal Law 2 (RPC Book 2)"); ss("CRIM105","Criminalistics 1");
        ss("CRIM106","Crime Detection and Investigation"); ss("CRIM107","Correctional Administration");
        ss("CRIM201","Criminal Procedure"); ss("CRIM202","Criminalistics 2");
        ss("CRIM203","Juvenile Delinquency"); ss("CRIM301","Thesis Writing");
        // Business
        ss("ACC101","Financial Accounting 1"); ss("MGT101","Principles of Management");
        ss("ECON101","Microeconomics"); ss("BUS101","Business Mathematics");
        ss("ACC102","Financial Accounting 2"); ss("MKT101","Principles of Marketing");
        ss("ECON102","Macroeconomics"); ss("BUS102","Business Law and Ethics");
        ss("MGT201","Operations Management"); ss("FIN101","Financial Management");
        ss("MGT301","Strategic Management"); ss("BUS301","Business Research");
        // Education
        ss("ED101","The Child and Adolescent Learner"); ss("ED102","The Teaching Profession");
        ss("ED103","Facilitating Learner-Centered Teaching"); ss("ED104","Technology for Teaching and Learning 1");
        ss("ED105","Assessment in Learning 1"); ss("ED106","Foundation of Education");
        ss("ED107","The Teacher and the Community"); ss("ED201","Curriculum Development");
        ss("ED202","Assessment in Learning 2"); ss("ED301","Practice Teaching");
        // Generic
        ss("SCI101","General Biology"); ss("ENG101","Technical Writing");
        ss("SCI102","General Chemistry"); ss("ENG102","Literature");
        ss("STAT101","Elementary Statistics"); ss("SOC102","Society and Culture");
        ss("SCI201","Ecology"); ss("RES101","Methods of Research");
    }

    private void ss(String code, String desc) {
        Subject s = new Subject(code, desc);
        subjectRepo.save(s);
    }

    // ── Grade Seeding ──

    private void seedGrades() {
        List<User> allUsers = userRepo.findAll();
        if (allUsers.isEmpty()) return;
        boolean anySeeded = allUsers.stream().anyMatch(u -> gradeRepo.existsByStuId(u.getStuId()));
        if (anySeeded) return;

        log.info("[Seeder] Seeding grade data for {} students...", allUsers.size());
        Random rng = new Random(42);
        Map<String, Subject> subjectMap = new HashMap<>();
        subjectRepo.findAll().forEach(s -> subjectMap.put(s.getSubjectCode(), s));

        for (User user : allUsers) {
            String course = user.getCourse() != null ? user.getCourse().toUpperCase() : "";
            int maxYear = parseYearLevel(user.getYearLevel());
            String[][] ayMap = {{"2022-2023"},{"2023-2024"},{"2024-2025"},{"2025-2026"}};

            for (int yr = 1; yr <= maxYear; yr++) {
                String ay = yr <= ayMap.length ? ayMap[yr-1][0] : "2025-2026";
                boolean isCurrentYear = (yr == maxYear);
                // 1st Semester always seeded for completed years and current year
                for (String[] subj : getSubjects(course, yr, "1st Semester")) {
                    Subject s = subjectMap.get(subj[0]);
                    if (s != null) saveGrade(user.getStuId(), s, randomGrade(rng), "1st Semester", ay, yr);
                }
                // 2nd Semester only for completed years
                if (!isCurrentYear) {
                    for (String[] subj : getSubjects(course, yr, "2nd Semester")) {
                        Subject s = subjectMap.get(subj[0]);
                        if (s != null) saveGrade(user.getStuId(), s, randomGrade(rng), "2nd Semester", ay, yr);
                    }
                }
            }
        }
        log.info("[Seeder] Grade seeding complete.");
    }

    private void saveGrade(String stuId, Subject subject, String grade, String semester, String ay, int yearLevel) {
        StudentGrade g = new StudentGrade();
        g.setStuId(stuId);
        g.setSubject(subject);
        g.setGrade(grade);
        g.setSemester(semester);
        g.setAcademicYear(ay);
        g.setYearLevel(yearLevel);
        gradeRepo.save(g);
    }

    private String randomGrade(Random rng) {
        String[] pool = {"1.00","1.00","1.25","1.25","1.25","1.50","1.50","1.50",
            "1.75","1.75","1.75","2.00","2.00","2.00","2.25","2.25",
            "2.50","2.50","2.75","3.00","INC","DRP"};
        return pool[rng.nextInt(pool.length)];
    }

    private int parseYearLevel(String yearLevel) {
        if (yearLevel == null) return 2;
        String t = yearLevel.trim().toLowerCase();
        if (t.startsWith("1")) return 1;
        if (t.startsWith("2")) return 2;
        if (t.startsWith("3")) return 3;
        if (t.startsWith("4")) return 4;
        return 2;
    }

    private List<String[]> getSubjects(String course, int year, String semester) {
        List<String[]> subjects = new ArrayList<>();
        // GE subjects vary by year
        if ("1st Semester".equals(semester)) {
            switch (year) {
                case 1 -> { subjects.add(s("GE 1")); subjects.add(s("GE 3")); subjects.add(s("PE 1")); subjects.add(s("NSTP 1")); }
                case 2 -> { subjects.add(s("GE 5")); subjects.add(s("GE 7")); subjects.add(s("PE 3")); }
                case 3 -> { subjects.add(s("GE 8")); }
            }
        } else {
            switch (year) {
                case 1 -> { subjects.add(s("GE 2")); subjects.add(s("GE 4")); subjects.add(s("PE 2")); subjects.add(s("NSTP 2")); }
                case 2 -> { subjects.add(s("GE 6")); subjects.add(s("PE 4")); }
            }
        }
        // Major subjects
        switch (course) {
            case "BSIT" -> addBsitSubjects(subjects, year, semester);
            case "BSCE" -> addBsceSubjects(subjects, year, semester);
            case "BSN" -> addBsnSubjects(subjects, year, semester);
            case "BSCRIM" -> addBscrimSubjects(subjects, year, semester);
            case "BSBA","BSA","BSENTREP" -> addBusinessSubjects(subjects, year, semester);
            case "BEED","BSED","BPED" -> addEducationSubjects(subjects, year, semester);
            case "BSEE","BSME","BSABE","BET" -> addEngineeringSubjects(subjects, year, semester);
            default -> addGenericSubjects(subjects, year, semester);
        }
        return subjects;
    }

    private String[] s(String code) { return new String[]{code}; }

    private void addBsitSubjects(List<String[]> list, int year, String sem) {
        if ("1st Semester".equals(sem)) {
            switch (year) {
                case 1 -> { list.add(s("CC101")); list.add(s("CC102")); list.add(s("IT101")); list.add(s("MS101")); }
                case 2 -> { list.add(s("IT201")); list.add(s("IT202")); list.add(s("CC105")); list.add(s("WD101")); }
                case 3 -> { list.add(s("IT301")); list.add(s("IT302")); list.add(s("IT303")); list.add(s("IT304")); }
                case 4 -> { list.add(s("IT305")); list.add(s("IT306")); }
            }
        } else {
            switch (year) {
                case 1 -> { list.add(s("CC103")); list.add(s("CC104")); list.add(s("PT101")); list.add(s("HCI101")); }
                case 2 -> { list.add(s("IT203")); list.add(s("IT204")); list.add(s("SE101")); list.add(s("IT205")); }
                case 3 -> { list.add(s("IT305")); list.add(s("IT306")); }
            }
        }
    }

    private void addBsceSubjects(List<String[]> list, int year, String sem) {
        if ("1st Semester".equals(sem)) {
            switch (year) {
                case 1 -> { list.add(s("CE101")); list.add(s("MATH101")); list.add(s("PHYS101")); list.add(s("CHEM101")); }
                case 2 -> { list.add(s("MATH201")); list.add(s("CE201")); list.add(s("CE202")); }
                case 3 -> { list.add(s("CE301")); list.add(s("CE302")); }
            }
        } else {
            switch (year) {
                case 1 -> { list.add(s("CE102")); list.add(s("MATH102")); list.add(s("PHYS102")); list.add(s("CE103")); }
                case 2 -> { list.add(s("CE203")); list.add(s("CE301")); }
            }
        }
    }

    private void addBsnSubjects(List<String[]> list, int year, String sem) {
        if ("1st Semester".equals(sem)) {
            switch (year) {
                case 1 -> { list.add(s("NUR101")); list.add(s("ANAT101")); list.add(s("MICRO101")); list.add(s("CHEM101")); }
                case 2 -> { list.add(s("NUR201")); list.add(s("NUR202")); }
                case 3 -> { list.add(s("NUR301")); list.add(s("NUR302")); }
            }
        } else {
            switch (year) {
                case 1 -> { list.add(s("NUR102")); list.add(s("ANAT102")); list.add(s("PHARM101")); list.add(s("NUR103")); }
                case 2 -> { list.add(s("NUR203")); }
            }
        }
    }

    private void addBscrimSubjects(List<String[]> list, int year, String sem) {
        if ("1st Semester".equals(sem)) {
            switch (year) {
                case 1 -> { list.add(s("CRIM101")); list.add(s("CRIM102")); list.add(s("CRIM103")); list.add(s("SOC101")); }
                case 2 -> { list.add(s("CRIM201")); list.add(s("CRIM202")); list.add(s("CRIM203")); }
                case 3 -> { list.add(s("CRIM301")); }
            }
        } else {
            switch (year) {
                case 1 -> { list.add(s("CRIM104")); list.add(s("CRIM105")); list.add(s("CRIM106")); list.add(s("CRIM107")); }
            }
        }
    }

    private void addBusinessSubjects(List<String[]> list, int year, String sem) {
        if ("1st Semester".equals(sem)) {
            switch (year) {
                case 1 -> { list.add(s("ACC101")); list.add(s("MGT101")); list.add(s("ECON101")); list.add(s("BUS101")); }
                case 2 -> { list.add(s("MGT201")); list.add(s("FIN101")); }
                case 3 -> { list.add(s("MGT301")); list.add(s("BUS301")); }
            }
        } else {
            switch (year) {
                case 1 -> { list.add(s("ACC102")); list.add(s("MKT101")); list.add(s("ECON102")); list.add(s("BUS102")); }
            }
        }
    }

    private void addEducationSubjects(List<String[]> list, int year, String sem) {
        if ("1st Semester".equals(sem)) {
            switch (year) {
                case 1 -> { list.add(s("ED101")); list.add(s("ED102")); list.add(s("ED103")); list.add(s("FIL101")); }
                case 2 -> { list.add(s("ED201")); list.add(s("ED202")); }
                case 3 -> { list.add(s("ED301")); }
            }
        } else {
            switch (year) {
                case 1 -> { list.add(s("ED104")); list.add(s("ED105")); list.add(s("ED106")); list.add(s("ED107")); }
            }
        }
    }

    private void addEngineeringSubjects(List<String[]> list, int year, String sem) {
        if ("1st Semester".equals(sem)) {
            switch (year) {
                case 1 -> { list.add(s("MATH101")); list.add(s("PHYS101")); list.add(s("CHEM101")); list.add(s("ENGR101")); }
                case 2 -> { list.add(s("MATH201")); list.add(s("CE201")); }
            }
        } else {
            switch (year) {
                case 1 -> { list.add(s("MATH102")); list.add(s("PHYS102")); list.add(s("ENGR102")); list.add(s("ENGR103")); }
            }
        }
    }

    private void addGenericSubjects(List<String[]> list, int year, String sem) {
        if ("1st Semester".equals(sem)) {
            switch (year) {
                case 1 -> { list.add(s("SCI101")); list.add(s("ENG101")); list.add(s("FIL101")); list.add(s("SOC101")); }
                case 2 -> { list.add(s("SCI201")); list.add(s("RES101")); }
            }
        } else {
            switch (year) {
                case 1 -> { list.add(s("SCI102")); list.add(s("ENG102")); list.add(s("FIL102")); list.add(s("STAT101")); }
                case 2 -> { list.add(s("SOC102")); }
            }
        }
    }
}
