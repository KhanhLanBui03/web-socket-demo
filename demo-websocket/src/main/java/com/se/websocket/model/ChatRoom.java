package com.se.websocket.model;

import java.util.ArrayList;
import java.util.List;

public class ChatRoom {
    private String roomId;
    private String name;
    private String createdBy;
    private List<String> members = new ArrayList<>();
    private boolean dm;

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public List<String> getMembers() {
        return members;
    }

    public void setMembers(List<String> m) {
        this.members = m;
    }

    public boolean isDm() {
        return dm;
    }

    public void setDm(boolean dm) {
        this.dm = dm;
    }

    public void addMember(String u) {
        if (!members.contains(u)) members.add(u);
    }

    public void removeMember(String u) {
        members.remove(u);
    }
}