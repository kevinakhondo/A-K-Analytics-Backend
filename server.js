require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();

app.use(express.json());
app.use(cors({
    origin: 'https://akaana.netlify.app',
    credentials: true
}));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Review Schema
const ReviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    text: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    approved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', ReviewSchema);

// User Schema
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Root Route
app.get('/', (req, res) => {
    res.json({ status: 'Backend is running', version: '1.0.0' });
});

// Review Submission
app.post('/api/reviews', async (req, res) => {
    try {
        const { name, text, rating } = req.body;
        if (!name || !text || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'All fields are required and rating must be 1-5' });
        }
        const review = new Review({ name, text, rating });
        await review.save();
        res.status(201).json({ message: 'Review submitted, pending approval' });
    } catch (error) {
        console.error('Error in POST /api/reviews:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Approved Reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error in GET /api/reviews:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Authentication Middleware
const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        if (token === process.env.ADMIN_TOKEN) return next();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user || !user.email.includes('kevinakhondo9@gmail.com')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get All Reviews (Admin)
app.get('/api/reviews/all', adminAuth, async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error in GET /api/reviews/all:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Review Approval (Admin)
app.patch('/api/reviews/:id', adminAuth, async (req, res) => {
    try {
        const { approved } = req.body;
        await Review.findByIdAndUpdate(req.params.id, { approved });
        res.json({ message: 'Review updated' });
    } catch (error) {
        console.error('Error in PATCH /api/reviews/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User Signup
app.post('/api/users/signup', async (req, res) => {
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
            verificationToken
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
                <a href="${verificationUrl}" style="padding: 10px 20px; background: #00bcd4; color: #ffffff; text-decoration: none; border-radius: 4px;">Verify Email</a>
                <p>If the button doesn't work, copy and paste this link: ${verificationUrl}</p>
            `
        });

        res.status(201).json({ message: 'User created. Please check your email to verify your account.' });
    } catch (error) {
        console.error('Error in POST /api/users/signup:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Email Verification
app.get('/api/users/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email, verificationToken: token });
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }
        user.isVerified = true;
        user.verificationToken = null;
        await user.save();
        const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Email verified successfully', token: authToken });
    } catch (error) {
        console.error('Error in GET /api/users/verify/:token:', error);
        res.status(400).json({ error: 'Invalid or expired verification token' });
    }
});

// User Login
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (!user.isVerified) {
            return res.status(401).json({ error: 'Please verify your email first' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error in POST /api/users/login:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User Profile (Protected)
app.get('/api/users/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password -verificationToken');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error in GET /api/users/profile:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));