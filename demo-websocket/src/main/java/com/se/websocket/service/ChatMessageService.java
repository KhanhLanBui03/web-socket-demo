package com.se.websocket.service;

import com.se.websocket.model.ChatMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatMessageService {

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.table.message:chat_message}")
    private String tableName;

    public ChatMessageService(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
    }

    /**
     * Tạo bảng nếu chưa tồn tại.
     * Schema: roomId (PK, String) + createdAt (SK, Number)
     */
    @PostConstruct
    public void initializeTable() {
        try {
            dynamoDbClient.describeTable(
                    DescribeTableRequest.builder().tableName(tableName).build()
            );
        } catch (ResourceNotFoundException e) {
            dynamoDbClient.createTable(CreateTableRequest.builder()
                    .tableName(tableName)
                    .attributeDefinitions(
                            AttributeDefinition.builder()
                                    .attributeName("roomId").attributeType(ScalarAttributeType.S).build(),
                            AttributeDefinition.builder()
                                    .attributeName("createdAt").attributeType(ScalarAttributeType.N).build()
                    )
                    .keySchema(
                            KeySchemaElement.builder()
                                    .attributeName("roomId").keyType(KeyType.HASH).build(),
                            KeySchemaElement.builder()
                                    .attributeName("createdAt").keyType(KeyType.RANGE).build()
                    )
                    .billingMode(BillingMode.PAY_PER_REQUEST) // Không cần quản lý capacity thủ công
                    .build());

            dynamoDbClient.waiter().waitUntilTableExists(
                    DescribeTableRequest.builder().tableName(tableName).build()
            );
        }
    }

    public void save(ChatMessage message) {
        // Gán giá trị mặc định nếu thiếu
        if (message.getRoomId() == null || message.getRoomId().isBlank()) {
            message.setRoomId("public");
        }
        if (message.getCreatedAt() == null) {
            message.setCreatedAt(System.currentTimeMillis());
        }
        // FIX: dùng UUID để tránh trùng messageId
        if (message.getMessageId() == null || message.getMessageId().isBlank()) {
            message.setMessageId(UUID.randomUUID().toString());
        }

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("roomId",     AttributeValue.builder().s(message.getRoomId()).build());
        item.put("createdAt",  AttributeValue.builder().n(String.valueOf(message.getCreatedAt())).build());
        item.put("messageId",  AttributeValue.builder().s(message.getMessageId()).build());
        item.put("sender",     AttributeValue.builder().s(nullSafe(message.getSender())).build());
        item.put("content",    AttributeValue.builder().s(nullSafe(message.getContent())).build());
        item.put("type",       AttributeValue.builder().s(
                message.getType() == null ? ChatMessage.MessageType.CHAT.name() : message.getType().name()
        ).build());
        item.put("callType",   AttributeValue.builder().s(nullSafe(message.getCallType(), "NONE")).build());
        item.put("callAction", AttributeValue.builder().s(nullSafe(message.getCallAction())).build());

        dynamoDbClient.putItem(PutItemRequest.builder().tableName(tableName).item(item).build());
    }

    public List<ChatMessage> findByRoomId(String roomId) {
        QueryRequest request = QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("#r = :roomId")
                .expressionAttributeNames(Map.of("#r", "roomId"))
                .expressionAttributeValues(Map.of(":roomId", AttributeValue.builder().s(roomId).build()))
                .scanIndexForward(true) // sắp xếp theo createdAt tăng dần
                .build();

        return dynamoDbClient.query(request).items().stream()
                .map(this::toMessage)
                .collect(Collectors.toList());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private ChatMessage toMessage(Map<String, AttributeValue> item) {
        ChatMessage msg = new ChatMessage();
        msg.setRoomId(item.get("roomId").s());
        msg.setCreatedAt(Long.parseLong(item.get("createdAt").n()));
        msg.setMessageId(getString(item, "messageId", ""));
        msg.setSender(getString(item, "sender", ""));
        msg.setContent(getString(item, "content", ""));
        msg.setType(ChatMessage.MessageType.valueOf(getString(item, "type", "CHAT")));
        msg.setCallType(getString(item, "callType", "NONE"));
        msg.setCallAction(getString(item, "callAction", ""));
        return msg;
    }

    private String getString(Map<String, AttributeValue> item, String key, String defaultVal) {
        AttributeValue v = item.get(key);
        return (v != null && v.s() != null) ? v.s() : defaultVal;
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private String nullSafe(String value, String defaultVal) {
        return (value == null || value.isBlank()) ? defaultVal : value;
    }
}