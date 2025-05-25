const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .populate('projects')
            .populate('bookings')
            .populate('supportTickets')
            .populate('invoices')
            .populate('notifications');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            name: user.name,
            email: user.email,
            role: user.role || (user.email === 'kevinakhondo9@gmail.com' ? 'admin' : 'customer'),
            profileCompletion: user.profileCompletion,
            projects: user.projects || [],
            analytics: [
                {
                    title: 'Sales Forecast Q2',
                    previewUrl: 'https://public.tableau.com/views/SuperstoreOverview/Dashboard1',
                    kpis: 'Accuracy: 93%'
                }
            ],
            bookings: user.bookings || [],
            supportTickets: user.supportTickets || [],
            invoices: user.invoices || [],
            notifications: user.notifications || [],
            preferences: {
                name: user.name,
                email: user.email,
                company: user.company,
                notificationChannels: user.notificationChannels
            }
        });
    } catch (error) {
        console.error('Error in GET /api/users/profile:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.email !== 'kevinakhondo9@gmail.com') {
            return res.status(403).json({ error: 'Unauthorized: Admin access only' });
        }
        const users = await User.find()
            .populate('projects')
            .populate('bookings')
            .populate('supportTickets')
            .populate('invoices')
            .populate('notifications');
        res.json(users);
    } catch (error) {
        console.error('Error in GET /api/users:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
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
        console.error('Error in POST /api/users/signup:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

router.get('/verify/:token', async (req, res) => {
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
        console.error('Error in GET /api/users/verify/:token:', error.message);
        res.status(400).json({ error: 'Invalid or expired verification token: ' + error.message });
    }
});

router.post('/login', async (req, res) => {
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
        const token = jwt.sign(
            { userId: user._id, role: user.role || (email === 'kevinakhondo9@gmail.com' ? 'admin' : 'customer') },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({
            message: 'Login successful',
            token,
            role: user.role || (email === 'kevinakhondo9@gmail.com' ? 'admin' : 'customer'),
            _id: user._id,
            email: user.email
        });
    } catch (error) {
        console.error('Error in POST /api/users/login:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

module.exports = router;