package com.iuep.seed;

import com.iuep.entity.Admin;
import com.iuep.entity.Course;
import com.iuep.entity.User;
import com.iuep.repository.AdminRepository;
import com.iuep.repository.CourseRepository;
import com.iuep.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private final UserRepository userRepo;
    private final AdminRepository adminRepo;
    private final CourseRepository courseRepo;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepo, AdminRepository adminRepo,
                      CourseRepository courseRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.adminRepo = adminRepo;
        this.courseRepo = courseRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedDemoUsers();
        seedCourses();
    }

    private void seedDemoUsers() {
        if (userRepo.count() > 0) return;
        log.info("[Seeder] Seeding demo users...");

        seedUser("202101", "Juan", "Dela", "Cruz", "BSIT", "3", "A", "2003-06-15", "juandelacruz@gmail.com");
        seedUser("202102", "Maria", "Santos", "Reyes", "BSCS", "2", "B", "2004-01-22", "maria.reyes@gmail.com");
        seedUser("202103", "Antonio", null, "Ramos", "BSEd", "1", "A", "2005-03-08", "antonio.ramos@gmail.com");
        seedUser("202104", "Lourdes", "Bautista", "Gonzales", "BSBA", "4", "C", "2002-11-30", "lourdes.gonzales@gmail.com");
        seedUser("202105", "Paolo", "Mendoza", "Navarro", "BSCRIM", "2", "A", "2004-07-19", "paolo.navarro@gmail.com");

        if (adminRepo.count() == 0) {
            Admin admin = new Admin();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setDisplayName("ID Office Admin");
            admin.setRole("id_production");
            adminRepo.save(admin);
        }
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
}
