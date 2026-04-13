const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'face-images');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const userId = req.params.id || 'unknown';
    const safeName = `${userId}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, safeName);
  }
});

const upload = multer({ storage });

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all users or filter by role
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.role) {
      query.role = req.query.role;
    }
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update student ID for a user
router.put('/update-id', authenticateToken, async (req, res) => {
  const { userId, studentId } = req.body;
  if (!userId || !studentId) {
    return res.status(400).json({ error: 'userId and studentId are required' });
  }

  if (!['host', 'instructor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only hosts/instructors can update student IDs' });
  }

  try {
    const duplicate = await User.findOne({ studentId, _id: { $ne: userId } });
    if (duplicate) {
      return res.status(409).json({ error: 'studentId is already in use' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { studentId },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get only students
router.get('/students', authenticateToken, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json({ success: true, students });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update user (basic)
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update student with image upload - supports both base64 and file upload
router.put('/:id/update-student', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, studentId } = req.body;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check for duplicate studentId if changing
    if (studentId && studentId !== existingUser.studentId) {
      const duplicate = await User.findOne({ studentId, _id: { $ne: id } });
      if (duplicate) {
        return res.status(409).json({ error: 'Student ID is already in use' });
      }
    }

    // Build update object
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (studentId) updateData.studentId = studentId.trim();

    // Handle image upload
    if (req.file) {
      // File upload via multer
      const savePath = `/uploads/face-images/${req.file.filename}`;
      updateData.imagePath = savePath;

      // Delete old image if exists
      if (existingUser.imagePath) {
        const oldPath = path.join(__dirname, '..', existingUser.imagePath.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    } else if (req.body.imageBase64) {
      // Base64 image upload
      const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `student-${id}-${Date.now()}.jpg`;
      const filepath = path.join(uploadDir, filename);

      fs.writeFileSync(filepath, buffer);
      updateData.imagePath = `/uploads/face-images/${filename}`;

      // Delete old image if exists
      if (existingUser.imagePath) {
        const oldPath = path.join(__dirname, '..', existingUser.imagePath.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Student updated successfully',
      student: updatedUser
    });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Enroll face
router.post('/:id/enroll-face', async (req, res) => {
  const { image } = req.body;
  
  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  try {
    console.log(`[ENROLL] Starting face enrollment for user ${req.params.id}`);
    console.log(`[ENROLL] Image size: ${image.length} bytes`);
    
    const axios = require('axios');
    
    // Try to enroll with AI service
    try {
      console.log('[ENROLL] Calling AI service at https://ai-attentance.onrender.com/enroll');
      const response = await axios.post('https://ai-attentance.onrender.com/enroll', {
        userId: req.params.id,
        image
      }, { timeout: 30000 }); // 30 second timeout
      
      console.log('[ENROLL] AI service response:', response.data);
      
      if (response.data.success) {
        const savedFileName = `user-${req.params.id}-${Date.now()}.jpg`;
        const savePath = path.join(uploadDir, savedFileName);
        fs.writeFileSync(savePath, Buffer.from(image, 'base64'));

        await User.findByIdAndUpdate(req.params.id, {
          faceEnrolled: true,
          imagePath: `/uploads/face-images/${savedFileName}`
        });

        console.log(`[ENROLL] SUCCESS: Face enrolled for user ${req.params.id}`);
        return res.json({ message: 'Face enrolled successfully', success: true, imagePath: `/uploads/face-images/${savedFileName}` });
      } else {
        console.log(`[ENROLL] AI service failed: ${response.data.error}`);
        return res.status(400).json({ error: response.data.error || 'AI service failed to process image' });
      }
    } catch (aiErr) {
      console.error('[ENROLL] AI Service Error:', aiErr.message);
      
      if (aiErr.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          error: 'AI service unavailable. Make sure Python AI service is running on port 8000',
          code: 'AI_SERVICE_DOWN'
        });
      }
      
      if (aiErr.code === 'ETIMEDOUT' || aiErr.code === 'ECONNABORTED') {
        return res.status(504).json({ 
          error: 'AI service timeout. Please try again',
          code: 'AI_SERVICE_TIMEOUT'
        });
      }
      
      throw aiErr;
    }
  } catch (err) {
    console.error('[ENROLL] Endpoint Error:', err.message, err.stack);
    res.status(500).json({ 
      error: err.message || 'Failed to enroll face',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Upload face using file input (proxy to Python AI service)
router.post('/:id/upload-face', upload.single('image'), async (req, res) => {
  const userId = req.params.id;

  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }

  try {
    const savePath = `/uploads/face-images/${req.file.filename}`;
    await User.findByIdAndUpdate(userId, {
      imagePath: savePath,
      faceEnrolled: true
    });

    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));
    formData.append('userId', userId);

    const response = await axios.post('https://ai-attentance.onrender.com/upload-face', formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    if (response.data.success) {
      return res.json({ message: 'Face uploaded and enrolled', success: true, ai: response.data, imagePath: savePath });
    }

    return res.status(422).json({ error: response.data.error || 'AI service did not register a face', imagePath: savePath });
  } catch (err) {
    console.error('[UPLOAD-FACE] Error:', err?.message || err);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI service unavailable (8000)', code: 'AI_SERVICE_DOWN' });
    }
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'AI service timeout', code: 'AI_SERVICE_TIMEOUT' });
    }
    return res.status(500).json({ error: err.response?.data?.error || err.message || 'Unexpected error' });
  }
});

module.exports = router;