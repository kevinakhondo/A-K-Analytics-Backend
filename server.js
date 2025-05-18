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

// Booking Schema
const BookingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    service: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', BookingSchema);

// Authentication Middleware (for users)
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

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
        req.user = user;
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

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

// Get User Reviews
app.get('/api/reviews/user/:name', authMiddleware, async (req, res) => {
    try {
        const name = req.params.name;
        if (req.user.name !== name && !req.user.email.includes('kevinakhondo9@gmail.com')) {
            return res.status(403).json({ error: 'Unauthorized to view these reviews' });
        }
        const reviews = await Review.find({ name }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error in GET /api/reviews/user/:name:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Pending Reviews Count (Admin)
app.get('/api/reviews/pending', adminAuth, async (req, res) => {
    try {
        const count = await Review.countDocuments({ approved: false });
        res.json({ count });
    } catch (error) {
        console.error('Error in GET /api/reviews/pending:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

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

// Create Booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { name, email, date, time, service, status } = req.body;
        if (!name || !email || !date || !time || !service) {
            return res.status(400).json({ error: 'All fields (name, email, date, time, service) are required' });
        }
        const booking = new Booking({
            name,
            email,
            date,
            time,
            service,
            status: status || 'pending' // Default to 'pending' if not provided
        });
        await booking.save();
        res.status(201).json({ message: 'Booking created successfully', booking });
    } catch (error) {
        console.error('Error in POST /api/bookings:', error);
        res.status(500).json({ error: 'Failed to create booking: ' + error.message });
    }
});

// Get All Bookings (Admin)
app.get('/api/bookings', adminAuth, async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error in GET /api/bookings:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Booking Status (Admin)
app.patch('/api/bookings/:id', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({ message: 'Booking status updated', booking });
    } catch (error) {
        console.error('Error in PATCH /api/bookings/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));