# Debugging Guide: Face Enrollment & Join Session Failures

## Changes Made

### 1. **Enhanced Error Logging** ✅
- **Backend `/enroll-face` endpoint**: Added comprehensive logging with `[ENROLL]` prefix
- **Backend `/join` endpoint**: Added comprehensive logging with `[JOIN]` prefix
- Both now log request details, validation steps, and success/failure

### 2. **Better Error Messages** ✅
- **Face Enrollment**: Now specifically detects and reports if AI service is down
  - Error code: `AI_SERVICE_DOWN` - AI service not running on port 8000
  - Error code: `AI_SERVICE_TIMEOUT` - AI service took too long to respond
- **Join Session**: Logs user ID, session ID, and each validation step

### 3. **Frontend Error Display** ✅
- **HostDashboard**: Now shows detailed server error messages (including AI service instructions)
- **VideoChat**: Now shows detailed error messages from server

### 4. **Express Configuration** ✅
- Increased body size limit to 50MB for base64 images
- Frontend can now send large video frames without hitting limits

---

## Most Likely Issues & Solutions

### Issue 1: "AI service unavailable. Make sure Python AI service is running on port 8000"

**Cause**: The Python Flask service is not running

**Solution**:
```bash
# Terminal 1: Backend (Node.js)
cd backend
npm dev

# Terminal 2: Frontend (React/Vite)
cd frontend
npm run dev

# Terminal 3: AI Service (Python) - THIS IS MISSING!
cd ai-service
python app.py
```

**Verify**: Check if `http://localhost:8000/` responds in browser

---

### Issue 2: "Already joined" or "Session not found"

**Possible Causes**:
1. User already in session - Try creating new session
2. Session ID is wrong - Check that `session._id` is being passed correctly
3. Session is not active - Host needs to keep session open

**Solution**: Create a fresh session before joining

---

### Issue 3: "User not authenticated"

**Cause**: Token is missing or invalid

**Solution**:
1. Check browser console for token in localStorage: `localStorage.getItem('token')`
2. If token missing, log out and log back in
3. If token exists but still fails, token might be expired - refresh page

---

## Testing Flow

### Step 1: Start All Services
```bash
# Terminal 1: MongoDB (if not running as service)
mongod

# Terminal 2: Backend
cd backend
npm dev

# Terminal 3: Frontend
cd frontend
npm run dev

# Terminal 4: AI Service
cd ai-service
python app.py
```

### Step 2: Test Face Enrollment
1. Register as **host** on http://localhost:5173
2. Log in
3. Click "Enroll Face" button
4. Allow camera access
5. Check:
   - Browser console for errors
   - Backend terminal for `[ENROLL]` logs
   - AI service terminal for activity

**Expected Output in Backend**:
```
[ENROLL] Starting face enrollment for user 65abc...
[ENROLL] Image size: 45213 bytes
[ENROLL] Calling AI service at http://localhost:8000/enroll
[ENROLL] AI service response: { success: true }
[ENROLL] SUCCESS: Face enrolled for user 65abc...
```

### Step 3: Test Join Session
1. Create a session (title not empty)
2. Go to session page
3. Click "Join Room" button
4. Check:
   - Browser console for errors
   - Backend terminal for `[JOIN]` logs

**Expected Output in Backend**:
```
[JOIN] User 65abc... attempting to join session 65def...
[JOIN] Session found. Active: true
[JOIN] Participant saved: 65xyz...
[JOIN] SUCCESS: User 65abc... joined session 65def...
```

---

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Cannot connect to service | Check if service is running |
| `Already joined` | User already in session | Create/try different session |
| `Session not found` | Wrong session ID | Refresh page, create new session |
| `Access token required` | Missing authorization header | Log in again |
| `Invalid token` | Token expired or malformed | Log out and log back in |
| `No face detected` | Face not visible in camera | Move closer to camera, ensure good lighting |

---

## Backend Endpoint Signatures

### POST `/api/users/:id/enroll-face`
```javascript
// Request
{
  "image": "base64_jpeg_string_without_prefix"
}

// Response (success)
{
  "message": "Face enrolled successfully",
  "success": true
}

// Response (error)
{
  "error": "No face detected",
  "code": "AI_SERVICE_DOWN"  // optional
}
```

### POST `/api/sessions/:id/join`
```javascript
// Request
{}

// Header
Authorization: Bearer `token`

// Response (success)
{
  "_id": "65xyz...",
  "session": "65def...",
  "user": "65abc...",
  "isActive": true,
  "joinTime": "2024-..."
}

// Response (error)
{
  "error": "Already joined"
}
```

---

## Debugging Commands

### Check if services are running:
```bash
# Backend on port 5000
curl https://ai-attentance.onrender.com/api/users

# Frontend on port 5173
# Open http://localhost:5173 in browser

# AI Service on port 8000
curl http://localhost:8000/
```

### Database check:
```bash
mongosh
> use attendance-system
> db.users.find()
> db.sessions.find()
> db.participants.find()
```

### Check localStorage token:
```javascript
// In browser console
console.log(localStorage.getItem('token'))
```

---

## Still Having Issues?

1. **Check all terminal outputs** for `[ENROLL]` or `[JOIN]` log messages
2. **Check browser console** (F12 → Console tab) for JavaScript errors
3. **Verify token exists**: `localStorage.getItem('token')`
4. **Verify all services running**:
   - Backend: `https://ai-attentance.onrender.com/api/users`
   - Frontend: `http://localhost:5173`
   - AI Service: `http://localhost:8000/`
5. **Check MongoDB connection**(backend startup logs should show "MongoDB connected")

---

## Files Modified

- `backend/routes/users.js` - Enhanced error logging for face enrollment
- `backend/routes/sessions.js` - Enhanced error logging for join session  
- `backend/server.js` - Increased body size limit
- `frontend/src/components/HostDashboard.tsx` - Better error display
- `frontend/src/components/VideoChat.tsx` - Better error display

