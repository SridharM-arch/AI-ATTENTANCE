# AI-Based Attendance System - Implementation Guide

This guide covers the implementation of the core AI face recognition and automatic attendance features.

## What Has Been Implemented

### 1. AI Face Recognition Service (Python/Flask)

**File**: `ai-service/app.py`

**Features**:
- Real face detection using OpenCV and face_recognition library
- Face enrollment endpoint to register user faces
- Face matching against enrolled faces
- Returns list of recognized users

**Endpoints**:
- `POST /enroll` - Register a user's face
  ```json
  {
    "userId": "user_id",
    "image": "base64_encoded_image"
  }
  ```
- `POST /detect` - Detect and recognize faces
  ```json
  {
    "image": "base64_encoded_image"
  }
  ```
  Returns:
  ```json
  {
    "detected": true,
    "faces": 1,
    "recognized_users": ["user_id1", "user_id2"]
  }
  ```

### 2. Backend Enhancements (Node.js/Express)

#### User API (`backend/routes/users.js`)
- **New Endpoint**: `POST /api/users/:id/enroll-face`
- Accepts base64 encoded image
- Forwards to Flask AI service
- Marks user's face as enrolled

#### Session Analytics (`backend/routes/sessions.js`)
- Enhanced analytics to include real attendance data
- Calculates verified vs total attendance marks
- Returns:
  - `avgAttendance`: Percentage of verified attendance
  - `totalAttendanceMarks`: Total attendance records
  - `verifiedAttendanceMarks`: Face-verified attendance

#### Socket.io Security (`backend/server.js`)
- JWT authentication on socket connection
- User ID validation for all socket events
- WebRTC signal relaying (sending-signal, returning-signal)
- Enhanced attendance update tracking

#### Database Model (`backend/models/User.js`)
- Added `faceEnrolled: Boolean` field to track enrollment status

### 3. Frontend Components (React/TypeScript)

#### HostDashboard (`frontend/src/components/HostDashboard.tsx`)
- **Face Enrollment Feature**:
  - UI button to enroll face
  - Captures video from webcam
  - Sends to backend for enrollment
  - Displays success/error messages
  - Shows enrollment status

#### VideoChat (`frontend/src/components/VideoChat.tsx`)
- **Automatic Attendance Marking**:
  - Captures video frames every 5 seconds
  - Sends frames to AI service for face detection
  - Automatically marks attendance when face recognized
  - Stores verified attendance in backend
  - Real-time attendance updates via Socket.io

- **Socket.io Integration**:
  - Authenticated socket connections using JWT
  - Uses actual user IDs instead of socket IDs
  - Proper peer connection setup for WebRTC

## Setup Instructions

### Prerequisites
- Node.js 16+
- Python 3.9+
- MongoDB (or use mock data)
- Git

### 1. Install AI Service Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

**Note**: The first pip install of `face-recognition` may take 10-15 minutes as it compiles dlib.

**Requirements**:
- Flask==2.3.3
- opencv-python==4.8.1.78
- face-recognition==1.3.0
- Pillow==10.0.1
- numpy==1.24.3

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 4. Environment Setup

Create `.env` file in `backend` directory:
```
MONGODB_URI=mongodb://localhost:27017/attendance-system
JWT_SECRET=your-secret-key
PORT=5000
```

Create `.env` file in `ai-service` directory (optional):
```
FLASK_ENV=development
FLASK_PORT=8000
```

## Running the Application

### Terminal 1: Start MongoDB
```bash
mongod
```

### Terminal 2: Start AI Service
```bash
cd ai-service
python app.py
```
Server starts on `http://localhost:8000`

### Terminal 3: Start Backend
```bash
cd backend
npm start
```
Server starts on `http://localhost:5000`

### Terminal 4: Start Frontend
```bash
cd frontend
npm run dev
```
Application opens on `http://localhost:5173`

## Usage Flow

### For Instructors/Hosts:

1. **Register/Login**
   - Go to landing page and select "Host"
   - Register or login with credentials

2. **Enroll Face** (One-time, in Dashboard)
   - Click "Enroll Face" button
   - Allow camera access
   - Face will be captured and registered with AI service
   - Status updates when complete

3. **Create Session**
   - Enter session title
   - Click "Create"
   - Session is created and ready for students

4. **Start Session**
   - Click "Start" on session
   - Joins video room with WebRTC

5. **View Analytics**
   - Check attendance metrics in real-time
   - See verified attendance percentage

### For Students:

1. **Join Session**
   - Enter session code or room ID
   - Optional: Register or join as guest
   - Allow camera and microphone access

2. **Automatic Attendance**
   - Once joined, system captures face every 5 seconds
   - If face matches enrolled profile, attendance is marked
   - Green indicator shows when recognized

3. **Video Conferencing**
   - Can toggle camera/microphone
   - See other participants
   - Real-time communication

## Key Features Implemented

### ✅ Face Enrollment
- Capture single frame from webcam
- Send to AI service for enrollment
- Store enrollment status in database

### ✅ Automatic Face Detection & Recognition
- Periodic frame capture during sessions
- Compare against enrolled faces
- Automatic attendance marking

### ✅ Real-time Attendance Tracking
- Attendance records stored in MongoDB
- Face verification flag for authenticity
- Real-time updates via Socket.io

### ✅ Enhanced Analytics
- Actual attendance calculations
- Verified attendance percentage
- Session duration tracking

### ✅ Security
- JWT authentication for socket connections
- User ID validation on socket events
- Role-based access control

## API Endpoints

### User Routes
```
POST   /api/users/register         - Register new user
POST   /api/users/login            - Login user
POST   /api/users/:id/enroll-face  - Enroll face (NEW)
GET    /api/users                  - Get all users
PUT    /api/users/:id              - Update user
DELETE /api/users/:id              - Delete user
```

### Session Routes
```
POST   /api/sessions               - Create session
GET    /api/sessions               - Get all sessions
GET    /api/sessions/:id           - Get session details
POST   /api/sessions/:id/join      - Join session
POST   /api/sessions/:id/end       - End session
GET    /api/sessions/:id/analytics - Get analytics (ENHANCED)
```

### Attendance Routes
```
POST   /api/attendance             - Record attendance (ENHANCED with face verification)
GET    /api/attendance/session/:id - Get session attendance
PUT    /api/attendance/:id         - Update attendance
DELETE /api/attendance/:id         - Delete attendance
```

## Socket.io Events

### Authenticated Events (Require JWT)
```
join-room           - User joins session room
leave-room          - User leaves session room
sending-signal      - WebRTC signal initiation
returning-signal    - WebRTC signal response
attendance-marked   - Attendance marked by face recognition
```

### Broadcast Events
```
user-joined         - Notify room when user joins
user-left           - Notify room when user leaves
attendance-update   - Broadcast attendance update
receiving-signal    - Relay WebRTC signal
receiving-returned-signal - Relay WebRTC response
```

## Testing the Face Recognition

### Manual Test:
```bash
# Test enrollment
curl -X POST http://localhost:8000/enroll \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","image":"base64_image_data"}'

# Test detection
curl -X POST http://localhost:8000/detect \
  -H "Content-Type: application/json" \
  -d '{"image":"base64_image_data"}'
```

## Troubleshooting

### Python package installation fails
- **Issue**: face-recognition requires dlib compilation
- **Solution**: 
  - Ensure you have a C++ compiler installed
  - On Windows: Download Microsoft C++ Build Tools
  - On Mac: Install Xcode Command Line Tools
  - On Linux: `sudo apt-get install python3-dev`

### Socket connection errors
- **Issue**: "Authentication error"
- **Solution**: Make sure token is saved in localStorage after login

### Face not being detected
- **Issue**: Low lighting, blurry image, or not enough face data
- **Solution**: 
  - Ensure good lighting during enrollment
  - Keep face centered in frame
  - Clear, non-pixelated image

### MongoDB connection error
- **Issue**: "MongoDB connection failed"
- **Solution**: 
  - Ensure MongoDB is running locally
  - Check MONGODB_URI in .env file
  - Or use MongoDB Atlas cloud

## Performance Optimization Tips

1. **Frame Capture**: Adjust capture interval from 5 seconds to 10 seconds for less computational load
2. **Face Recognition Tolerance**: Adjust tolerance parameter (0.6) in `app.py` for stricter/looser matching
3. **Database Indexing**: Create indexes on frequently queried fields
4. **Socket Connections**: Implement connection pooling for better scalability

## Security Recommendations

1. **HTTPS/WSS**: Deploy with HTTPS and WebSocket Secure (WSS) in production
2. **Rate Limiting**: Implement rate limiting on API endpoints
3. **Input Validation**: Validate all image inputs and user data
4. **Token Expiration**: Use shorter JWT expiration times
5. **Image Storage**: Store face images securely, consider encryption
6. **Privacy**: Implement GDPR compliance for face data storage

## Next Steps for Enhancement

1. **Face Recognition Accuracy**: Train custom model with more face data
2. **Liveness Detection**: Detect if person is truly present (not a photo/video)
3. **Multiple Faces**: Support marking attendance for multiple people in frame
4. **Session Recording**: Record sessions with participant information
5. **Export Reports**: Export attendance reports to CSV/PDF
6. **Mobile Support**: Develop mobile app for better accessibility
7. **High Availability**: Deploy with load balancing and database replication

## Support & Documentation

- Flask Documentation: https://flask.palletsprojects.com/
- face_recognition library: https://github.com/ageitgey/face_recognition
- Socket.io: https://socket.io/docs/
- WebRTC: https://webrtc.org/

## License

MIT License - Feel free to use and modify for your needs.
