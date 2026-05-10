package com.iuep.controller;

import com.iuep.entity.User;
import com.iuep.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{stuId}")
    public ResponseEntity<?> getUser(@PathVariable String stuId) {
        User user = userService.getUser(stuId);
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("stu_id", user.getStuId());
        map.put("username", user.getUsername());
        map.put("first_name", user.getFirstName());
        map.put("middle_name", user.getMiddleName());
        map.put("last_name", user.getLastName());
        map.put("course", user.getCourse());
        map.put("year_level", user.getYearLevel());
        map.put("section", user.getSection());
        map.put("birthday", user.getBirthday());
        map.put("email", user.getEmail());
        map.put("profile_pic", user.getProfilePic());
        map.put("created_at", user.getCreatedAt());
        return ResponseEntity.ok(map);
    }

    @PatchMapping("/{stuId}/profile-pic")
    public ResponseEntity<?> updateProfilePic(@PathVariable String stuId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(userService.updateProfilePic(stuId, body.get("profilePic")));
    }

    @PatchMapping("/{stuId}/username")
    public ResponseEntity<?> updateUsername(@PathVariable String stuId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(userService.updateUsername(stuId, body.get("username")));
    }

    @PatchMapping("/{stuId}/password")
    public ResponseEntity<?> updatePassword(@PathVariable String stuId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(userService.updatePassword(stuId, body.get("currentPassword"), body.get("newPassword")));
    }
}
