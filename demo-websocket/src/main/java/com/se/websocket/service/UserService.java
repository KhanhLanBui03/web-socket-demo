package com.se.websocket.service;

import com.se.websocket.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import jakarta.annotation.PostConstruct;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.table.user:chat_user}")
    private String tableName;

    public UserService(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
    }

    @PostConstruct
    public void initializeTable() {
        try {
            dynamoDbClient.describeTable(DescribeTableRequest.builder().tableName(tableName).build());
        } catch (ResourceNotFoundException e) {
            dynamoDbClient.createTable(CreateTableRequest.builder()
                    .tableName(tableName)
                    .attributeDefinitions(
                            AttributeDefinition.builder().attributeName("username").attributeType(ScalarAttributeType.S).build()
                    )
                    .keySchema(
                            KeySchemaElement.builder().attributeName("username").keyType(KeyType.HASH).build()
                    )
                    .billingMode(BillingMode.PAY_PER_REQUEST)
                    .build());
            dynamoDbClient.waiter().waitUntilTableExists(
                    DescribeTableRequest.builder().tableName(tableName).build()
            );
        }
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public void save(User user) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("username", av(user.getUsername()));
        item.put("displayName", av(str(user.getDisplayName(), user.getUsername())));
        item.put("passwordHash", av(str(user.getPasswordHash())));
        item.put("status", av(str(user.getStatus(), "OFFLINE")));
        item.put("lastSeen", avn(String.valueOf(user.getLastSeen() == null ? System.currentTimeMillis() : user.getLastSeen())));

        dynamoDbClient.putItem(PutItemRequest.builder().tableName(tableName).item(item).build());
    }

    public Optional<User> findByUsername(String username) {
        GetItemResponse res = dynamoDbClient.getItem(GetItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("username", av(username)))
                .build());
        if (!res.hasItem() || res.item().isEmpty()) return Optional.empty();
        return Optional.of(toUser(res.item()));
    }

    public boolean existsByUsername(String username) {
        return findByUsername(username).isPresent();
    }

    /**
     * Lấy tất cả user (dùng cho danh sách online). Scan phù hợp vì bảng nhỏ.
     */
    public List<User> findAll() {
        return dynamoDbClient.scan(ScanRequest.builder().tableName(tableName).build())
                .items().stream().map(this::toUser).collect(Collectors.toList());
    }

    public List<User> findOnlineUsers() {
        return findAll().stream()
                .filter(u -> "ONLINE".equals(u.getStatus()))
                .collect(Collectors.toList());
    }

    /**
     * Cập nhật status và lastSeen
     */
    public void updateStatus(String username, String status) {
        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("username", av(username)))
                .updateExpression("SET #s = :s, lastSeen = :ls")
                .expressionAttributeNames(Map.of("#s", "status"))
                .expressionAttributeValues(Map.of(
                        ":s", av(status),
                        ":ls", avn(String.valueOf(System.currentTimeMillis()))
                ))
                .build());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User toUser(Map<String, AttributeValue> item) {
        User u = new User();
        u.setUsername(s(item, "username", ""));
        u.setDisplayName(s(item, "displayName", ""));
        u.setPasswordHash(s(item, "passwordHash", ""));
        u.setStatus(s(item, "status", "OFFLINE"));
        if (item.containsKey("lastSeen")) u.setLastSeen(Long.parseLong(item.get("lastSeen").n()));
        return u;
    }

    private AttributeValue av(String v) {
        return AttributeValue.builder().s(v).build();
    }

    private AttributeValue avn(String v) {
        return AttributeValue.builder().n(v).build();
    }

    private String s(Map<String, AttributeValue> item, String key, String def) {
        AttributeValue v = item.get(key);
        return (v != null && v.s() != null) ? v.s() : def;
    }

    private String str(String v) {
        return v == null ? "" : v;
    }

    private String str(String v, String def) {
        return (v == null || v.isBlank()) ? def : v;
    }
}