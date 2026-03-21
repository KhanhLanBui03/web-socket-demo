package com.se.websocket.controller;

import com.se.websocket.model.ChatMessage;
import com.se.websocket.service.ChatMessageService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageService    chatMessageService;

    // Các type này chứa base64 / data lớn — KHÔNG lưu DynamoDB
    private static final Set<ChatMessage.MessageType> SKIP_SAVE = Set.of(
            ChatMessage.MessageType.FILE,
            ChatMessage.MessageType.IMAGE
    );

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          ChatMessageService chatMessageService) {
        this.messagingTemplate  = messagingTemplate;
        this.chatMessageService = chatMessageService;
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        ChatMessage.MessageType defaultType = chatMessage.getType() == ChatMessage.MessageType.LEAVE
                ? ChatMessage.MessageType.LEAVE
                : ChatMessage.MessageType.CHAT;
        prepare(chatMessage, defaultType);

        // FILE / IMAGE chứa base64 rất lớn → bỏ qua DynamoDB, chỉ broadcast realtime
        if (!SKIP_SAVE.contains(chatMessage.getType())) {
            chatMessageService.save(chatMessage);
        }

        broadcast(chatMessage);
    }

    @MessageMapping("/chat.addUser")
    public void addUser(@Payload ChatMessage chatMessage,
                        SimpMessageHeaderAccessor headerAccessor) {
        prepare(chatMessage, ChatMessage.MessageType.JOIN);

        Map<String, Object> attrs = headerAccessor.getSessionAttributes();
        if (attrs != null) {
            attrs.put("username", chatMessage.getSender());
            attrs.put("roomId",   chatMessage.getRoomId());
        }

        chatMessageService.save(chatMessage);
        broadcast(chatMessage);
    }

    @MessageMapping("/chat.call")
    public void call(@Payload ChatMessage chatMessage) {
        prepare(chatMessage, ChatMessage.MessageType.CALL);
        chatMessageService.save(chatMessage);
        broadcast(chatMessage);
    }

    private void prepare(ChatMessage msg, ChatMessage.MessageType defaultType) {
        if (msg.getRoomId() == null || msg.getRoomId().isBlank()) msg.setRoomId("public");
        if (msg.getType() == null) msg.setType(defaultType);
        msg.setCreatedAt(System.currentTimeMillis());
        msg.setMessageId(UUID.randomUUID().toString());
    }

    private void broadcast(ChatMessage msg) {
        messagingTemplate.convertAndSend("/topic/rooms/" + msg.getRoomId(), msg);
    }
}