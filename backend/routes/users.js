const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const User = require('../models/User');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
      console.log('[ENROLL] Calling AI service at http://localhost:8000/enroll');
      const response = await axios.post('http://localhost:8000/enroll', {
        userId: req.params.id,
        image
      }, { timeout: 30000 }); // 30 second timeout
      
      console.log('[ENROLL] AI service response:', response.data);
      
      if (response.data.success) {
        // Update user model
        await User.findByIdAndUpdate(req.params.id, { faceEnrolled: true });
        console.log(`[ENROLL] SUCCESS: Face enrolled for user ${req.params.id}`);
        return res.json({ message: 'Face enrolled successfully', success: true });
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
    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('userId', userId);

    const response = await axios.post('http://localhost:8000/upload-face', formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    if (response.data.success) {
      await User.findByIdAndUpdate(userId, { faceEnrolled: true });
      return res.json({ message: 'Face uploaded and enrolled', success: true, ai: response.data });
    }

    return res.status(422).json({ error: response.data.error || 'AI service did not register a face' });
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