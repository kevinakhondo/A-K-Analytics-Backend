const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const transporter = require('../config/email');

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -verificationToken');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileCompletion: user.profileCompletion || 0,
      projects: user.projects || [],
      analytics: [],
      bookings: user.bookings || [],
      supportTickets: user.supportTickets || [],
      invoices: user.invoices || [],
      notifications: user.notifications || [],
      preferences: {
        name: user.name,
        email: user.email,
        company: user.company || '',
        notificationChannels: user.notificationChannels || [],
      },
    });
  } catch (error) {
    console.error('GET /api/users/profile:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const user = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
    });
    await user.save();

    const verificationUrl = `https://akaana.netlify.app/?verify=${verificationToken}`;
    await transporter.sendMail({
      from: `"A & K Analytics" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h2>Welcome to A & K Analytics!</h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${verificationUrl}" style="padding:10px 20px;background:#00bcd4;color:#fff;text-decoration:none;border-radius:4px;">Verify Email</a>
        <p>Or copy: ${verificationUrl}</p>
      `,
    });

    res.status(201).json({ message: 'User created. Please check your email to verify your account.' });
  } catch (error) {
    console.error('POST /api/users/signup:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/verify/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email, verificationToken: req.params.token });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });
    user.isVerified = true;
    user.verificationToken = null;
    await user.save();
    const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Email verified successfully', token: authToken });
  } catch {
    res.status(400).json({ error: 'Invalid or expired verification token' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    const isMatch = user && await bcrypt.compare(password, user.password);
    if (!user || !isMatch || !user.isVerified) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, role: user.role, _id: user._id, email: user.email });
  } catch (error) {
    console.error('POST /api/users/login:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
