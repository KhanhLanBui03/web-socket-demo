package com.se.websocket.controller;

import com.se.websocket.model.User;
import com.se.websocket.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest req) {
        if (req.username() == null || req.username().isBlank() ||
                req.password() == null || req.password().isBlank()) {
            return ResponseEntity.badRequest().body(error("Username và password không được rỗng"));
        }
        if (req.username().length() < 3) {
            return ResponseEntity.badRequest().body(error("Username tối thiểu 3 ký tự"));
        }
        if (userService.existsByUsername(req.username())) {
            return ResponseEntity.badRequest().body(error("Username đã tồn tại"));
        }

        User user = new User();
        user.setUsername(req.username().trim().toLowerCase());
        user.setDisplayName(req.displayName() == null || req.displayName().isBlank()
                ? req.username() : req.displayName().trim());
        user.setPasswordHash(bcrypt.encode(req.password()));
        user.setStatus("OFFLINE");
        user.setLastSeen(System.currentTimeMillis());
        userService.save(user);

        return ResponseEntity.ok(userPayload(user));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest req) {
        if (req.username() == null || req.password() == null) {
            return ResponseEntity.badRequest().body(error("Thiếu thông tin đăng nhập"));
        }

        return userService.findByUsername(req.username().trim().toLowerCase())
                .filter(u -> bcrypt.matches(req.password(), u.getPasswordHash()))
                .map(u -> {
                    userService.updateStatus(u.getUsername(), "ONLINE");
                    // FIX: ép kiểu tường minh sang ResponseEntity<Map<String, Object>>
                    ResponseEntity<Map<String, Object>> response = ResponseEntity.ok(userPayload(u));
                    return response;
                })
                .orElse(ResponseEntity.status(401).body(error("Sai username hoặc password")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        if (username != null && !username.isBlank()) {
            userService.updateStatus(username, "OFFLINE");
        }
        return ResponseEntity.ok().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Dùng HashMap để Java không infer sai generic type
     */
    private Map<String, Object> error(String message) {
        Map<String, Object> map = new HashMap<>();
        map.put("error", message);
        return map;
    }

    private Map<String, Object> userPayload(User u) {
        Map<String, Object> map = new HashMap<>();
        map.put("username", u.getUsername());
        map.put("displayName", u.getDisplayName());
        return map;
    }

    record RegisterRequest(String username, String password, String displayName) {
    }

    record LoginRequest(String username, String password) {
    }
}