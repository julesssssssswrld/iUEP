package com.iuep.service;

import com.iuep.entity.IdApplication;
import com.iuep.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Shared mapper that converts an IdApplication entity into a rich API response map.
 * Eliminates the duplicated enrichApplication() logic that was in both
 * AdminService and IdApplicationService.
 */
@Component
public class IdApplicationMapper {

    private final UserRepository userRepo;

    public IdApplicationMapper(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    /**
     * Converts an IdApplication entity into a response map enriched with student info.
     */
    public Map<String, Object> toMap(IdApplication app) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", app.getId());
        map.put("student_id", app.getStudentId());
        map.put("status", app.getStatus());
        map.put("photo_base64", app.getPhotoBase64());
        map.put("cor_base64", app.getCorBase64());
        map.put("photo_path", app.getPhotoPath());
        map.put("cor_path", app.getCorPath());
        map.put("library_id", app.getLibraryId());
        map.put("rejection_reason", app.getRejectionReason());
        map.put("lost_reason", app.getLostReason());
        map.put("submitted_at", app.getSubmittedAt());
        map.put("updated_at", app.getUpdatedAt());
        map.put("updated_by", app.getUpdatedBy());

        // photo_url / cor_url for frontend compatibility
        map.put("photo_url", app.getPhotoPath() != null ? app.getPhotoPath() : app.getPhotoBase64());
        map.put("cor_url", app.getCorPath() != null ? app.getCorPath() : app.getCorBase64());

        // Enrich with student info
        userRepo.findByStuId(app.getStudentId()).ifPresent(user -> {
            map.put("first_name", user.getFirstName());
            map.put("middle_name", user.getMiddleName());
            map.put("last_name", user.getLastName());
            map.put("course", user.getCourse());
            map.put("year_level", user.getYearLevel());
            map.put("section", user.getSection());
            map.put("stu_id", user.getStuId());
        });

        return map;
    }
}
