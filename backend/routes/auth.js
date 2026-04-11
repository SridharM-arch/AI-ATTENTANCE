const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

/* Request Validation Helper */
const validateLoginRequest = (email, password, hostId) => {
  const errors = [];
  
  if (!hostId && !email) {
    errors.push('Email or hostId is required');
  }
  
  if (!password) {
    errors.push('Password is required');
  }
  
  if (email && typeof email !== 'string') {
    errors.push('Email must be a string');
  }
  
  if (password && typeof password !== 'string') {
    errors.push('Password must be a string');
  }
  
  if (email && email.trim().length === 0) {
    errors.push('Email cannot be empty');
  }
  
  if (password && password.length === 0) {
    errors.push('Password cannot be empty');
  }
  
  return errors;
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'User registered', hostId: user.hostId });
  } catch (err) {
    console.error('[Register Error]', err);
    
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// Login (supports hostId for instructors)
router.post('/login', async (req, res) => {
  const { email, password, hostId } = req.body;
  
  // Validate request body
  const validationErrors = validateLoginRequest(email, password, hostId);
  if (validationErrors.length > 0) {
    console.warn('[Login Validation Error]', validationErrors.join(', '));
    return res.status(400).json({ 
      error: validationErrors.join('; '),
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Check if database is connected
    if (User.collection.db.serverConfig.isConnected() === false) {
      console.warn('[Login] Database connection not ready');
      return res.status(503).json({ 
        error: 'Database unavailable. Please try again in a moment.',
        timestamp: new Date().toISOString()
      });
    }
    
    let user;
    let searchCriteria = {};
    
    if (hostId) {
      searchCriteria = { hostId };
    } else {
      searchCriteria = { email: email.toLowerCase().trim() };
    }
    
    console.log('[Login Attempt]', { method: hostId ? 'hostId' : 'email', hostId: hostId || 'N/A', email: email || 'N/A' });
    
    // Set a timeout for the database query
    const userPromise = User.findOne(searchCriteria);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 8000)
    );
    
    user = await Promise.race([userPromise, timeoutPromise]);
    
    if (!user) {
      console.warn('[Login Failed] User not found', searchCriteria);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn('[Login Failed] Invalid password for user', { userId: user._id, email: user.email });
      return res.status(401).json({ 
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '1h' }
    );
    
    console.log('[Login Success]', { userId: user._id, role: user.role, email: user.email });
    
    res.json({
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        role: user.role,
        hostId: user.hostId,
        studentId: user.studentId,
        imagePath: user.imagePath
      }
    });
  } catch (err) {
    console.error('[Login Server Error]', { 
      message: err.message, 
      stack: err.stack,
      email: req.body.email || 'N/A'
    });
    
    // Handle specific errors
    if (err.message.includes('timeout') || err.message.includes('buffering')) {
      return res.status(503).json({ 
        error: 'Service temporarily unavailable. Please try again.',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({ 
      error: 'Login failed. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
});

// Forgot Password (placeholder)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  // In a real app, send reset email
  res.json({ message: 'Reset email sent (placeholder)' });
});

// Refresh token
router.post('/refresh', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: 'Token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const newToken = jwt.sign({ id: decoded.id, role: decoded.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    res.json({ token: newToken });
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

module.exports = router;