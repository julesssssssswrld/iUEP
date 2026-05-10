package com.iuep.service;

import com.iuep.entity.IdApplication;
import com.iuep.entity.User;
import com.iuep.exception.GlobalExceptionHandler.ApiException;
import com.iuep.repository.IdApplicationRepository;
import com.iuep.repository.UserRepository;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class IdApplicationService {

    private final IdApplicationRepository appRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    @Value("${app.upload-dir}")
    private String uploadDir;

    public IdApplicationService(IdApplicationRepository appRepo, UserRepository userRepo, NotificationService notificationService) {
        this.appRepo = appRepo;
        this.userRepo = userRepo;
        this.notificationService = notificationService;
    }

    public Map<String, Object> getLatest(String stuId) {
        var app = appRepo.findFirstByStudentIdOrderByIdDesc(stuId);
        if (app.isEmpty()) return null;
        return enrichApplication(app.get());
    }

    public Map<String, Object> getDigitalId(String stuId) {
        List<IdApplication> apps = appRepo.findByStudentId(stuId);
        for (IdApplication app : apps) {
            if (List.of("completed", "claimed").contains(app.getStatus())) {
                return enrichApplication(app);
            }
        }
        return null;
    }

    @Transactional
    public Map<String, Object> submit(String studentId, String photoBase64, String corBase64, String libraryId) {
        if (studentId == null || photoBase64 == null || corBase64 == null || libraryId == null) {
            throw ApiException.badRequest("Missing required fields");
        }
        if (!photoBase64.matches("^data:image/(jpeg|png|jpg).*")) {
            throw ApiException.badRequest("ID Photo must be a JPG or PNG image.");
        }
        if (!corBase64.matches("^data:image/(jpeg|png|jpg).*")) {
            throw ApiException.badRequest("COR must be a JPG or PNG image.");
        }
        userRepo.findByStuId(studentId).orElseThrow(() -> ApiException.notFound("Student not found"));

        try {
            Path idImgDir = Paths.get(uploadDir, "id-applications").toAbsolutePath().normalize();
            Files.createDirectories(idImgDir);

            long timestamp = System.currentTimeMillis();
            String photoFilename = studentId + "_photo_" + timestamp + ".jpg";
            String corFilename = studentId + "_cor_" + timestamp + ".jpg";

            compressAndSave(photoBase64, idImgDir.resolve(photoFilename).toFile(), 800, 0.8f);
            compressAndSave(corBase64, idImgDir.resolve(corFilename).toFile(), 1200, 0.8f);

            // Ledger cleanup: delete only unfinalized active applications to prevent spam.
            // Keep all terminal states ('completed', 'claimed', 'rejected', 'lost', 'lost_requested', 'lost_declined')
            List<IdApplication> existingApps = appRepo.findByStudentId(studentId);
            IdApplication app = new IdApplication();
            for (IdApplication existing : existingApps) {
                String s = existing.getStatus();
                // Delete only active in-progress applications so they only have 1 active at a time
                if (List.of("uploaded", "received", "processing").contains(s)) {
                    appRepo.delete(existing);
                }
            }

            app.setStudentId(studentId);
            app.setStatus("uploaded");
            app.setPhotoPath("/uploads/id-applications/" + photoFilename);
            app.setCorPath("/uploads/id-applications/" + corFilename);
            app.setLibraryId(libraryId);
            appRepo.save(app);

            // Notify admins of new submission
            notificationService.notifyAdmins("new_submission", Map.of("studentId", studentId));

            return enrichApplication(app);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace(); // Log the actual error for debugging
            throw new RuntimeException("Failed to save ID application", e);
        }
    }

    private void compressAndSave(String base64Data, File output, int maxWidth, float quality) throws Exception {
        String raw = base64Data.replaceFirst("^data:.*?;base64,", "");
        byte[] imageBytes = Base64.getDecoder().decode(raw);
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
        if (image == null) throw new Exception("Could not read image data");
        int width = Math.min(image.getWidth(), maxWidth);
        Thumbnails.of(image).width(width).outputFormat("jpg").outputQuality(quality).toFile(output);
    }

    /** Requests a replacement for a claimed ID */
    public Map<String, Object> reportLost(String stuId, String reason) {
        var appOpt = appRepo.findFirstByStudentIdOrderByIdDesc(stuId);
        if (appOpt.isEmpty()) {
            throw ApiException.notFound("No application found for this student.");
        }

        IdApplication activeApp = appOpt.get();
        if (!"claimed".equals(activeApp.getStatus()) && !"lost_declined".equals(activeApp.getStatus())) {
            throw ApiException.badRequest("Only fully claimed IDs or declined requests can be reported as lost or damaged.");
        }

        // Create a new ledger entry for the request
        IdApplication lostRequest = new IdApplication();
        lostRequest.setStudentId(stuId);
        lostRequest.setStatus("lost_requested");
        lostRequest.setLostReason(reason);
        lostRequest.setUpdatedBy("student");
        appRepo.save(lostRequest);

        // Notify admins of lost ID request
        notificationService.notifyAdmins("status_update", Map.of("studentId", stuId, "status", "lost_requested"));

        return Map.of("success", true, "message", "Replacement request submitted. Awaiting admin approval.");
    }

    private Map<String, Object> enrichApplication(IdApplication app) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", app.getId());
        map.put("student_id", app.getStudentId());
        map.put("status", app.getStatus());
        map.put("photo_path", app.getPhotoPath());
        map.put("cor_path", app.getCorPath());
        map.put("photo_base64", app.getPhotoBase64());
        map.put("cor_base64", app.getCorBase64());
        map.put("library_id", app.getLibraryId());
        map.put("rejection_reason", app.getRejectionReason());
        map.put("lost_reason", app.getLostReason());
        map.put("submitted_at", app.getSubmittedAt());
        map.put("updated_at", app.getUpdatedAt());
        map.put("photo_url", app.getPhotoPath() != null ? app.getPhotoPath() : app.getPhotoBase64());
        map.put("cor_url", app.getCorPath() != null ? app.getCorPath() : app.getCorBase64());
        userRepo.findByStuId(app.getStudentId()).ifPresent(user -> {
            map.put("first_name", user.getFirstName());
            map.put("middle_name", user.getMiddleName());
            map.put("last_name", user.getLastName());
            map.put("course", user.getCourse());
            map.put("year_level", user.getYearLevel());
            map.put("section", user.getSection());
        });
        return map;
    }
}
