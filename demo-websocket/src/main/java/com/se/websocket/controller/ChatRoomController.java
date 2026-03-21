package com.se.websocket.controller;

import com.se.websocket.model.ChatMessage;
import com.se.websocket.model.ChatRoom;
import com.se.websocket.service.ChatMessageService;
import com.se.websocket.service.ChatRoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
public class ChatRoomController {

    private final ChatRoomService    chatRoomService;
    private final ChatMessageService chatMessageService;

    public ChatRoomController(ChatRoomService chatRoomService,
                              ChatMessageService chatMessageService) {
        this.chatRoomService    = chatRoomService;
        this.chatMessageService = chatMessageService;
    }

    @GetMapping
    public List<ChatRoom> getAllRooms(@RequestParam(required = false) String username) {
        if (username != null && !username.isBlank()) {
            return chatRoomService.findByMember(username);
        }
        return chatRoomService.findAll();
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<ChatRoom> getRoom(@PathVariable String roomId) {
        return chatRoomService.findById(roomId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Search for public chat rooms by name.
     * Returns rooms that match the query string (case-insensitive).
     */
    @GetMapping("/search")
    public List<ChatRoom> searchRooms(@RequestParam String q) {
        return chatRoomService.searchByName(q);
    }

    /**
     * FIX: không còn phụ thuộc vào in-memory map.
     * Lịch sử chat được lấy thẳng từ DynamoDB theo roomId.
     * Trả về danh sách rỗng (200 OK) nếu chưa có tin nhắn nào.
     */
    @GetMapping("/{roomId}/history")
    public ResponseEntity<List<ChatMessage>> getHistory(@PathVariable String roomId) {
        List<ChatMessage> messages = chatMessageService.findByRoomId(roomId);
        return ResponseEntity.ok(messages);
    }

    @PostMapping
    public ResponseEntity<ChatRoom> createRoom(@RequestBody ChatRoom room) {
        if (room.getName() == null || room.getName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        ChatRoom created = chatRoomService.create(room.getName(), room.getCreatedBy());
        return ResponseEntity.ok(created);
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<ChatRoom> joinRoom(@PathVariable String roomId,
                                             @RequestBody JoinRoomRequest request) {
        return chatRoomService.join(roomId, request.getUsername())
                ? chatRoomService.findById(roomId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build())
                : ResponseEntity.notFound().build();
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<Void> leaveRoom(@PathVariable String roomId,
                                          @RequestParam String username) {
        return chatRoomService.leave(roomId, username)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable String roomId) {
        chatRoomService.delete(roomId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Inner class for join request body
     */
    public static class JoinRoomRequest {
        private String username;

        public JoinRoomRequest() {}

        public JoinRoomRequest(String username) {
            this.username = username;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }
    }
}