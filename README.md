# AI-Based Visual Communication System with Automatic Face Attendance

This is a full-stack web application for real-time video conferencing with AI-powered face detection for attendance.

## Features
- Real-time video conferencing using WebRTC and Socket.io
- AI face detection using OpenCV
- User authentication and session management
- CRUD operations for users, sessions, and attendance

## Setup

### Prerequisites
- Node.js
- Python 3.9+
- MongoDB (optional, currently commented out)

### Installation

1. Clone the repository.
2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```
4. Install AI service dependencies:
   ```
   cd ai-service
   pip install -r requirements.txt
   ```

### Running the Application

1. Start the backend:
   ```
   cd backend
   npm start
   ```
2. Start the frontend:
   ```
   cd frontend
   npm run dev
   ```
3. Start the AI service:
   ```
   cd ai-service
   python app.py
   ```

4. Open http://localhost:5173/ in your browser.

### Usage
- Enter a room ID and click "Join Room" to start video conferencing.
- The system will automatically detect faces and mark attendance every 5 seconds.

## Architecture
- **Frontend**: React with WebRTC for video, Socket.io for signaling.
- **Backend**: Node.js with Express and Socket.io.
- **AI Service**: Python Flask with OpenCV for face detection.
- **Database**: MongoDB (models defined, connection commented out).