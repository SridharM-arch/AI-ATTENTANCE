const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'User registered', hostId: user.hostId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login (supports hostId for instructors)
router.post('/login', async (req, res) => {
  const { email, password, hostId } = req.body; // hostId for hosts, email for others
  try {
    let user;
    if (hostId) {
      user = await User.findOne({ hostId });
    } else {
      user = await User.findOne({ email });
    }
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    res.json({ token, user: { _id: user._id, id: user._id, name: user.name, role: user.role, hostId: user.hostId } });
  } catch (err) {
    res.status(500).json({ error: err.message });
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