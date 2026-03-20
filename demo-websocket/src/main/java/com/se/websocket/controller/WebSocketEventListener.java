package com.se.websocket.controller;

import com.se.websocket.model.ChatMessage;
import com.se.websocket.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    @Autowired
    private UserService userService;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        logger.info("Received a new web socket connection");
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> attrs = headerAccessor.getSessionAttributes();
        if (attrs == null) return;

        String username = (String) attrs.get("username");
        if (username == null) return;

        logger.info("User Disconnected: {}", username);

        // 1. Gửi LEAVE message vào room (giữ nguyên logic cũ)
        ChatMessage chatMessage = new ChatMessage();
        chatMessage.setType(ChatMessage.MessageType.LEAVE);
        chatMessage.setSender(username);

        Object roomObj = attrs.get("roomId");
        if (roomObj != null) {
            String roomId = roomObj.toString();
            chatMessage.setRoomId(roomId);
            messagingTemplate.convertAndSend("/topic/rooms/" + roomId, chatMessage);
        } else {
            messagingTemplate.convertAndSend("/topic/public", chatMessage);
        }

        // 2. Cập nhật status OFFLINE trong DynamoDB (logic mới)
        //    Dùng try-catch để không làm lỗi flow cũ nếu user chưa đăng ký
        try {
            userService.updateStatus(username, "OFFLINE");
            // Broadcast để các client khác refresh danh sách online
            messagingTemplate.convertAndSend("/topic/users/online",
                    (Object) Map.of("type", "USER_OFFLINE", "username", username));
        } catch (Exception e) {
            logger.warn("Could not update status for user {}: {}", username, e.getMessage());
        }
    }
}