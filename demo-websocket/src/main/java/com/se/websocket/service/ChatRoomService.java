package com.se.websocket.service;

import com.se.websocket.model.ChatRoom;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatRoomService {

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.table.room:chat_room}")
    private String tableName;

    public ChatRoomService(DynamoDbClient dynamoDbClient) {
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
                            AttributeDefinition.builder().attributeName("roomId").attributeType(ScalarAttributeType.S).build()
                    )
                    .keySchema(
                            KeySchemaElement.builder().attributeName("roomId").keyType(KeyType.HASH).build()
                    )
                    .billingMode(BillingMode.PAY_PER_REQUEST)
                    .build());
            dynamoDbClient.waiter().waitUntilTableExists(
                    DescribeTableRequest.builder().tableName(tableName).build()
            );
        }
    }

    public List<ChatRoom> findAll() {
        return dynamoDbClient.scan(ScanRequest.builder().tableName(tableName).build())
                .items().stream().map(this::toRoom).collect(Collectors.toList());
    }

    public List<ChatRoom> findGroupRooms() {
        return findAll().stream().filter(r -> !r.isDm()).collect(Collectors.toList());
    }

    public Optional<ChatRoom> findById(String roomId) {
        GetItemResponse res = dynamoDbClient.getItem(GetItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("roomId", av(roomId)))
                .build());
        if (!res.hasItem() || res.item().isEmpty()) return Optional.empty();
        return Optional.of(toRoom(res.item()));
    }

    public ChatRoom create(String name, String createdBy) {
        ChatRoom room = new ChatRoom();
        room.setRoomId(UUID.randomUUID().toString());
        room.setName(name);
        room.setCreatedBy(createdBy);
        room.setDm(false);
        room.addMember(createdBy);
        put(room);
        return room;
    }

    public ChatRoom createDm(String roomId, String name, String userA, String userB) {
        ChatRoom room = new ChatRoom();
        room.setRoomId(roomId);
        room.setName(name);
        room.setCreatedBy(userA);
        room.setDm(true);
        room.addMember(userA);
        room.addMember(userB);
        put(room);
        return room;
    }

    public boolean join(String roomId, String username) {
        return findById(roomId).map(r -> { r.addMember(username); put(r); return true; }).orElse(false);
    }

    public boolean leave(String roomId, String username) {
        return findById(roomId).map(r -> { r.removeMember(username); put(r); return true; }).orElse(false);
    }

    public void delete(String roomId) {
        dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("roomId", av(roomId)))
                .build());
    }

    private void put(ChatRoom room) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("roomId",    av(room.getRoomId()));
        item.put("name",      av(str(room.getName())));
        item.put("createdBy", av(str(room.getCreatedBy())));
        item.put("isDm",      AttributeValue.builder().bool(room.isDm()).build());
        List<AttributeValue> members = room.getMembers().stream().map(this::av).collect(Collectors.toList());
        item.put("members", AttributeValue.builder().l(members).build());
        dynamoDbClient.putItem(PutItemRequest.builder().tableName(tableName).item(item).build());
    }

    private ChatRoom toRoom(Map<String, AttributeValue> item) {
        ChatRoom room = new ChatRoom();
        room.setRoomId(s(item, "roomId", ""));
        room.setName(s(item, "name", ""));
        room.setCreatedBy(s(item, "createdBy", ""));
        AttributeValue isDmVal = item.get("isDm");
        room.setDm(isDmVal != null && Boolean.TRUE.equals(isDmVal.bool()));
        AttributeValue membersAttr = item.get("members");
        if (membersAttr != null && membersAttr.hasL()) {
            room.setMembers(membersAttr.l().stream().map(AttributeValue::s).collect(Collectors.toList()));
        }
        return room;
    }

    private AttributeValue av(String v)  { return AttributeValue.builder().s(v).build(); }
    private String s(Map<String, AttributeValue> item, String key, String def) {
        AttributeValue v = item.get(key); return (v != null && v.s() != null) ? v.s() : def;
    }
    private String str(String v) { return v == null ? "" : v; }
}