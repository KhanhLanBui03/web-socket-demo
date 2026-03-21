package com.se.websocket.model;

public class ChatMessage {

    private String     messageId;
    private String     roomId;
    private MessageType type;
    private String     content;
    private String     sender;
    private Long       createdAt;
    private String     callType;   // AUDIO, VIDEO, NONE
    private String     callAction; // INVITE, ACCEPT, END

    // ── File / Image (base64 hoặc URL) ───────────────────────────────────────
    private String fileUrl;   // base64 data URL hoặc S3 URL
    private String fileName;  // tên file gốc
    private String fileType;  // "image" | "file"
    private Long   fileSize;  // bytes

    // ── Location ─────────────────────────────────────────────────────────────
    private Double latitude;
    private Double longitude;
    private String locationName;

    public enum MessageType {
        CHAT,
        JOIN,
        LEAVE,
        CALL,
        FILE,      // gửi file (pdf, doc, zip...)
        IMAGE,     // gửi ảnh
        LOCATION   // chia sẻ vị trí
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String getMessageId()                   { return messageId; }
    public void   setMessageId(String messageId)   { this.messageId = messageId; }

    public String getRoomId()                      { return roomId; }
    public void   setRoomId(String roomId)         { this.roomId = roomId; }

    public MessageType getType()                   { return type; }
    public void        setType(MessageType type)   { this.type = type; }

    public String getContent()                     { return content; }
    public void   setContent(String content)       { this.content = content; }

    public String getSender()                      { return sender; }
    public void   setSender(String sender)         { this.sender = sender; }

    public Long   getCreatedAt()                   { return createdAt; }
    public void   setCreatedAt(Long createdAt)     { this.createdAt = createdAt; }

    public String getCallType()                    { return callType; }
    public void   setCallType(String callType)     { this.callType = callType; }

    public String getCallAction()                  { return callAction; }
    public void   setCallAction(String callAction) { this.callAction = callAction; }

    public String getFileUrl()                     { return fileUrl; }
    public void   setFileUrl(String fileUrl)       { this.fileUrl = fileUrl; }

    public String getFileName()                    { return fileName; }
    public void   setFileName(String fileName)     { this.fileName = fileName; }

    public String getFileType()                    { return fileType; }
    public void   setFileType(String fileType)     { this.fileType = fileType; }

    public Long   getFileSize()                    { return fileSize; }
    public void   setFileSize(Long fileSize)       { this.fileSize = fileSize; }

    public Double getLatitude()                    { return latitude; }
    public void   setLatitude(Double latitude)     { this.latitude = latitude; }

    public Double getLongitude()                   { return longitude; }
    public void   setLongitude(Double longitude)   { this.longitude = longitude; }

    public String getLocationName()                        { return locationName; }
    public void   setLocationName(String locationName)     { this.locationName = locationName; }
}