package com.iuep.controller;

import com.iuep.service.IdApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/id-application")
public class IdApplicationController {

    private final IdApplicationService service;

    public IdApplicationController(IdApplicationService service) {
        this.service = service;
    }

    @GetMapping("/{stuId}")
    public ResponseEntity<?> getLatest(@PathVariable String stuId) {
        var result = service.getLatest(stuId);
        return ResponseEntity.ok(result); // null is fine — frontend expects it
    }

    @PostMapping
    public ResponseEntity<?> submit(@RequestBody Map<String, String> body) {
        var result = service.submit(
                body.get("studentId"),
                body.get("photoBase64"),
                body.get("corBase64"),
                body.get("libraryId"));
        return ResponseEntity.status(201).body(result);
    }
}
