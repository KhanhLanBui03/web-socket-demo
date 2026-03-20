package com.se.websocket.controller;

import com.se.websocket.model.ChatRoom;
import com.se.websocket.model.User;
import com.se.websocket.service.ChatRoomService;
import com.se.websocket.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService     userService;
    private final ChatRoomService chatRoomService;

    public UserController(UserService userService, ChatRoomService chatRoomService) {
        this.userService     = userService;
        this.chatRoomService = chatRoomService;
    }

    /** GET /api/users — tất cả user (trừ chính mình) */
    @GetMapping
    public List<Map<String, Object>> getAllUsers(@RequestParam(required = false) String exclude) {
        return userService.findAll().stream()
                .filter(u -> !u.getUsername().equals(exclude))
                .sorted(Comparator.comparing((User u) -> !"ONLINE".equals(u.getStatus()))
                        .thenComparing(User::getDisplayName))
                .map(u -> Map.<String, Object>of(
                        "username",    u.getUsername(),
                        "displayName", u.getDisplayName(),
                        "status",      u.getStatus() == null ? "OFFLINE" : u.getStatus(),
                        "lastSeen",    u.getLastSeen() == null ? 0L : u.getLastSeen()
                ))
                .toList();
    }

    /** GET /api/users/online — chỉ user đang online */
    @GetMapping("/online")
    public List<Map<String, Object>> getOnlineUsers() {
        return userService.findOnlineUsers().stream()
                .map(u -> Map.<String, Object>of(
                        "username",    u.getUsername(),
                        "displayName", u.getDisplayName()
                ))
                .toList();
    }

    /**
     * POST /api/users/dm
     * Body: { "from": "alice", "to": "bob" }
     * Tạo hoặc lấy room DM giữa 2 user.
     * roomId cố định = "dm_<userA>_<userB>" (sort alphabet)
     */
    @PostMapping("/dm")
    public ResponseEntity<ChatRoom> getOrCreateDmRoom(@RequestBody Map<String, String> body) {
        String from = body.get("from");
        String to   = body.get("to");

        if (from == null || to == null || from.isBlank() || to.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        // roomId nhất quán bất kể ai gọi trước
        String roomId = "dm_" + Stream.of(from, to).sorted().reduce((a, b) -> a + "_" + b).orElse(from + "_" + to);

        ChatRoom room = chatRoomService.findById(roomId).orElseGet(() -> {
            // tạo mới nếu chưa có
            String displayName = from + " & " + to;
            return chatRoomService.createDm(roomId, displayName, from, to);
        });

        return ResponseEntity.ok(room);
    }
}