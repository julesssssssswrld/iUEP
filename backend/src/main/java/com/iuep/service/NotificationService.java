package com.iuep.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * WebSocket notification service for real-time updates.
 */
@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /** Notify a student that their ID application status changed */
    public void notifyStatusUpdate(String studentId, String newStatus) {
        messagingTemplate.convertAndSend(
                "/topic/status/" + studentId,
                Map.of("studentId", studentId, "status", newStatus)
        );
    }

    /** Broadcast to all admin subscribers */
    public void notifyAdmins(String event, Object data) {
        messagingTemplate.convertAndSend("/topic/admin", Map.of("event", event, "data", data));
    }
}
