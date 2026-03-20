# WebSocket Real-time Chat Application

A **full-stack real-time chat application** demonstrating WebSocket communication with Spring Boot backend and React frontend. Users can create/join chat rooms, send direct messages, share files/images, and make audio/video calls.

## ✨ Key Features

- 💬 **Real-time Messaging** — Instant message delivery via WebSocket (STOMP protocol)
- 👥 **Group & Direct Chats** — Create rooms or DM other users
- 📁 **File & Image Sharing** — Upload PDFs, docs, images with preview
- 📍 **Location Sharing** — Google Maps integration
- 🎉 **Emoji Support** — 70+ emoji picker
- 🎥 **Audio/Video Calls** — Call initiation and notifications
- 👤 **User Presence** — Online/offline status tracking with "last seen"
- 🔐 **Authentication** — Registration & login with BCrypt password hashing
- 🗄️ **Message History** — Persistent storage in AWS DynamoDB

## 📋 Prerequisites

- **Java 17+** and **Maven** (or use Maven wrapper `mvnw` included in the project)
- **Node.js 16+** and **npm** (or yarn)
- **AWS Account** (for DynamoDB, or configure another database)

## 🚀 Quick Start

### 1. Run the Backend (Spring Boot)

From the repository root:

**Windows (PowerShell):**
```powershell
cd demo-websocket
.\mvnw.cmd spring-boot:run
```

**macOS / Linux:**
```bash
cd demo-websocket
./mvnw spring-boot:run
```

**Alternative: Build & run JAR:**
```bash
cd demo-websocket
./mvnw clean package
java -jar target/demo-websocket-0.0.1-SNAPSHOT.jar
```

Backend runs on: `http://localhost:8080`

### 2. Run the Frontend (React + Vite)

```bash
cd react
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

Then open your browser to `http://localhost:3000` and register/login to start chatting.

### 3. Run Tests

**Backend tests:**
```bash
cd demo-websocket
./mvnw test
```

## 🛠️ Configuration

### Backend Configuration

**File:** `demo-websocket/src/main/resources/application.properties`

```properties
server.port=8080
spring.application.name=websocket-chat

# AWS DynamoDB (set via environment variables)
aws.region=${AWS_REGION}
aws.accessKeyId=${AWS_ACCESS_KEY_ID}
aws.secretAccessKey=${AWS_SECRET_ACCESS_KEY}
aws.dynamodb.table.message=${DYNAMODB_TABLE_MESSAGE}
aws.dynamodb.table.room=${DYNAMODB_TABLE_ROOM}
aws.dynamodb.table.user=${DYNAMODB_TABLE_USER}
```

**DynamoDB Config:** See `demo-websocket/src/main/java/com/se/websocket/config/DynamoDbConfig.java`

**WebSocket Config:** See `demo-websocket/src/main/java/com/se/websocket/config/WebSocketConfig.java`
- Endpoint: `ws://localhost:8080/ws`
- CORS: Allows `http://localhost:3000` with credentials
- STOMP message broker enabled

### Frontend Configuration

**Vite Dev Server** (automatically proxies requests to backend):
- Dev port: `3000`
- Backend proxy: `/ws`, `/app`, `/topic` → `localhost:8080`

## 📡 API Reference

### WebSocket Endpoint

**Base URL:** `ws://localhost:8080/ws`

**Protocol:** STOMP (Simple Text Oriented Messaging Protocol) with SockJS fallback

#### WebSocket Message Mappings

| Endpoint | Type | Payload | Description |
|----------|------|---------|-------------|
| `/app/chat.sendMessage` | Message Send | `ChatMessage` | Send message to room; broadcasts to `/topic/rooms/{roomId}` |
| `/app/chat.addUser` | User Join | `ChatMessage` | User joins room; broadcasts JOIN event to room |
| `/app/chat.call` | Call Initiate | `ChatMessage` | Initiate audio/video call; broadcasts CALL message |

#### WebSocket Subscriptions

| Topic | Purpose |
|-------|---------|
| `/topic/rooms/{roomId}` | Receive messages from specific room |
| `/topic/public` | Default room messages |
| `/topic/users/online` | Online user status updates |

#### ChatMessage Object

```json
{
  "messageId": "uuid",
  "roomId": "room-id-or-dm-room-id",
  "type": "CHAT|JOIN|LEAVE|CALL",
  "content": "message text or call type",
  "sender": "username",
  "createdAt": 1710000000000,
  "callType": "AUDIO|VIDEO|null",
  "callAction": "INVITE|ACCEPT|END|null"
}
```

---

### REST API Endpoints

#### Authentication (`/api/auth`)

| Method | Endpoint | Request | Response | Description |
|--------|----------|---------|----------|-------------|
| `POST` | `/api/auth/register` | `{username, password, displayName?}` | `{username, displayName}` | Register new user (min 3 chars username) |
| `POST` | `/api/auth/login` | `{username, password}` | `{username, displayName}` or `{error}` | Login; returns 401 if invalid |
| `POST` | `/api/auth/logout` | `{username}` | 200 OK | Set user status to OFFLINE |

#### Chat Rooms (`/api/rooms`)

| Method | Endpoint | Request | Response | Description |
|--------|----------|---------|----------|-------------|
| `GET` | `/api/rooms` | — | `List<ChatRoom>` | Get all chat rooms |
| `GET` | `/api/rooms/{roomId}` | — | `ChatRoom` or 404 | Get specific room details |
| `GET` | `/api/rooms/{roomId}/history` | — | `List<ChatMessage>` | Get message history from DynamoDB |
| `POST` | `/api/rooms` | `{name, createdBy}` | `ChatRoom` | Create new chat room |
| `POST` | `/api/rooms/{roomId}/join` | `?username=...` | 200 OK or 404 | Add user to room |
| `POST` | `/api/rooms/{roomId}/leave` | `?username=...` | 200 OK or 404 | Remove user from room |
| `DELETE` | `/api/rooms/{roomId}` | — | 204 No Content | Delete room |

#### Users (`/api/users`)

| Method | Endpoint | Request | Response | Description |
|--------|----------|---------|----------|-------------|
| `GET` | `/api/users` | `?exclude=username` | `List<User>` | Get all users (sorted: online first); includes username, displayName, status, lastSeen |
| `GET` | `/api/users/online` | — | `List<User>` | Get only online users |
| `POST` | `/api/users/dm` | `{from, to}` | `ChatRoom` | Create or get DM room (ID format: `dm_userA_userB`) |

#### User Model

```json
{
  "username": "john_doe",
  "displayName": "John Doe",
  "status": "ONLINE|OFFLINE",
  "lastSeen": 1710000000000
}
```

#### ChatRoom Model

```json
{
  "roomId": "room-unique-id",
  "name": "General Chat",
  "createdBy": "admin",
  "members": ["user1", "user2", "user3"],
  "isDm": false
}
```

---

## � Documentation & Images

Store project images, screenshots, and diagrams in the `docs/images/` folder:

```
docs/images/
  ├── screenshot-chat-ui.png
  ├── architecture-diagram.png
  └── ... (add your images here)
```

You can reference images in documentation files:
```markdown
![Chat UI](docs/images/screenshot-chat-ui.png)
![Architecture](docs/images/architecture-diagram.png)
```

## 📁 Project Structure

```
.
├── docs/                              # Documentation & Assets
│   └── images/                        # Place screenshots, diagrams, etc. here
│
├── demo-websocket/                    # Spring Boot Backend
│   ├── src/main/java/com/se/websocket/
│   │   ├── Application.java           # Main application entry
│   │   ├── config/
│   │   │   ├── WebSocketConfig.java   # WebSocket & STOMP setup
│   │   │   ├── SecurityConfig.java    # Spring Security config
│   │   │   └── DynamoDbConfig.java    # AWS DynamoDB integration
│   │   ├── controller/
│   │   │   ├── AuthController.java    # login/register endpoints
│   │   │   ├── ChatRoomController.java # room management
│   │   │   ├── UserController.java    # user management
│   │   │   ├── ChatController.java    # message handling (if exists)
│   │   │   └── WebSocketEventListener.java # WebSocket events
│   │   ├── model/
│   │   │   ├── User.java
│   │   │   ├── ChatRoom.java
│   │   │   └── ChatMessage.java
│   │   ├── service/
│   │   │   ├── UserService.java
│   │   │   ├── ChatRoomService.java
│   │   │   └── ChatMessageService.java
│   │   └── ...
│   ├── pom.xml                        # Maven dependencies
│   ├── mvnw / mvnw.cmd                # Maven wrapper (Windows & *nix)
│   └── ...
│
├── react/                              # React Frontend
│   ├── src/
│   │   ├── main.tsx                   # Entry point
│   │   ├── App.tsx                    # Main UI component
│   │   ├── index.css                  # Global styles
│   │   └── ...
│   ├── package.json                   # npm dependencies
│   ├── vite.config.ts                 # Vite build configuration
│   ├── tsconfig.json                  # TypeScript configuration
│   └── index.html                     # HTML template
│
└── README.md                           # This file
```

## 🧪 Testing

### Backend Tests

```bash
cd demo-websocket
./mvnw test
```

Tests are located in `demo-websocket/src/test/java/`

### Manual Testing

1. Open `http://localhost:3000` in two browser tabs/windows
2. Register two accounts and log in
3. One user creates a room, the other joins
4. Send messages — they should appear instantly
5. Test file/image upload, emoji, location sharing

## 🐛 Troubleshooting

### WebSocket Connection Failed

**Problem:** Frontend cannot connect to backend WebSocket

**Solutions:**
- Verify backend is running on `localhost:8080`
- Check browser console for errors (F12 → Console tab)
- Ensure backend CORS settings allow `http://localhost:3000`
- Check firewall/proxy isn't blocking WebSocket

### DynamoDB Connection Error

**Problem:** Messages not saving or DynamoDB error in logs

**Solutions:**
- Set AWS credentials (environment variables or IAM role):
  ```bash
  export AWS_REGION=us-east-1
  export AWS_ACCESS_KEY_ID=your-key
  export AWS_SECRET_ACCESS_KEY=your-secret
  ```
- Ensure DynamoDB tables exist: `message`, `room`, `user` (or set table names via env vars)
- Use AWS CLI to verify table access:
  ```bash
  aws dynamodb describe-table --table-name message --region us-east-1
  ```

### Port Already in Use

**Backend (8080):**
```bash
cd demo-websocket
./mvnw spring-boot:run -Dspring-boot.run.arguments="--server.port=9000"
```

**Frontend (3000):**
```bash
cd react
npm run dev -- --port 4000
```

## 📦 Dependencies

### Backend (Spring Boot)
- Spring Boot Web, WebSocket
- Spring Security (authentication)
- AWS SDK for DynamoDB
- BCrypt (password hashing)
- Others (see `demo-websocket/pom.xml`)

### Frontend (React)
- React 18
- Vite
- TypeScript
- @stomp/stompjs (WebSocket STOMP client)
- sockjs-client (WebSocket fallback)

## 🚀 Next Steps / Future Enhancements

- [ ] **Database** — Replace DynamoDB with PostgreSQL/MongoDB for easier local development
- [ ] **Authentication** — Add JWT tokens, refresh token rotation
- [ ] **Message Encryption** — End-to-end encryption for private chats
- [ ] **Notifications** — Browser/mobile push notifications
- [ ] **Docker** — Add Dockerfile & docker-compose for easy deployment
- [ ] **Tests** — Expand unit & integration tests
- [ ] **UI** — Add dark/light theme toggle, accessibility improvements
- [ ] **Performance** — Add message pagination, lazy loading for room history

## 📄 License

This is a demo project. Adjust as needed for your use case.

---

For questions or improvements, feel free to open an issue or pull request!

