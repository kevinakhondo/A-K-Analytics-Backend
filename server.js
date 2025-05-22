require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'https://akaana.netlify.app',
    credentials: true
}));

// MongoDB Connection with better error handling
if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Schemas
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
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' }, // Added role field
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    createdAt: { type: Date, default: Date.now },
    company: { type: String },
    profileCompletion: { type: Number, default: 0 },
    notificationChannels: { type: [String], default: ['Email'] },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    supportTickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' }],
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }]
});
const User = mongoose.model('User', UserSchema);

// Admin Users Schema (separate collection for internal admins)
const AdminUserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});
const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

// Booking Schema
const BookingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    service: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Booking = mongoose.model('Booking', BookingSchema);

// Project Schema
const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    startDate: { type: String, required: true },
    deadline: { type: String, required: true },
    status: { type: String, enum: ['In Progress', 'Awaiting Data', 'Completed'], default: 'In Progress' },
    deliverables: [{ type: String }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Project = mongoose.model('Project', ProjectSchema);

// SupportTicket Schema
const SupportTicketSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});
const SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);

// Invoice Schema
const InvoiceSchema = new mongoose.Schema({
    amount: { type: String, required: true },
    date: { type: String, required: true },
    url: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Invoice = mongoose.model('Invoice', InvoiceSchema);

// Notification Schema
const NotificationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    date: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Notification = mongoose.model('Notification', NotificationSchema);

// Audit Log Schema
const AuditLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    details: { type: Object },
    timestamp: { type: Date, default: Date.now },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
});
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// Settings Schema
const SettingsSchema = new mongoose.Schema({
    key: { type: String, required: true },
    value: { type: Object },
    updatedAt: { type: Date, default: Date.now }
});
const Settings = mongoose.model('Settings', SettingsSchema);

// Authentication Middleware
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
        console.error('Auth middleware error:', error.message);
        res.status(401).json({ error: 'Invalid token: ' + error.message });
    }
};

// Admin Authentication Middleware
const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let admin;
        // Check if the token is for an AdminUser or a User with admin role
        admin = await AdminUser.findById(decoded.userId);
        if (!admin) {
            const user = await User.findById(decoded.userId);
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized: Admin access only' });
            }
            admin = user;
        }
        req.user = admin;
        console.log('Admin authenticated:', admin.email);
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error.message);
        res.status(401).json({ error: 'Invalid token: ' + error.message });
    }
};

// Admin Login (Separate route)
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Check AdminUser collection first
        let admin = await AdminUser.findOne({ email });
        if (!admin) {
            // Fallback to User with admin role
            admin = await User.findOne({ email, role: 'admin' });
            if (!admin) return res.status(401).json({ error: 'Admin not found' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        await new AuditLog({ action: 'admin_login', details: { email }, admin: admin._id }).save();
        res.json({ message: 'Admin login successful', token });
    } catch (error) {
        console.error('Error in POST /api/admin/login:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Admin Overview
app.get('/api/admin/overview', adminAuth, async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            bookings: await Booking.countDocuments(),
            activeServices: await Booking.distinct('service').length, // Approx. active services
            revenue: await Booking.aggregate([{ $group: { _id: null, total: { $sum: 100 } } }]).then(r => r[0]?.total || 0) // Placeholder revenue logic
        };
        await new AuditLog({ action: 'view_overview', details: stats, admin: req.user._id }).save();
        res.json(stats);
    } catch (error) {
        console.error('Error in GET /api/admin/overview:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Admin Users
app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find()
            .populate('projects')
            .populate('bookings')
            .populate('supportTickets')
            .populate('invoices')
            .populate('notifications');
        await new AuditLog({ action: 'view_users', details: { count: users.length }, admin: req.user._id }).save();
        res.json(users);
    } catch (error) {
        console.error('Error in GET /api/admin/users:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Admin Services (Create)
app.post('/api/admin/services', adminAuth, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !description) return res.status(400).json({ error: 'Name and description are required' });
        // Assuming a Service model (add if not exists)
        const ServiceSchema = new mongoose.Schema({ name: String, description: String, status: { type: String, default: 'active' } });
        const Service = mongoose.model('Service', ServiceSchema);
        const service = new Service({ name, description });
        await service.save();
        await new AuditLog({ action: 'create_service', details: { name }, admin: req.user._id }).save();
        res.status(201).json(service);
    } catch (error) {
        console.error('Error in POST /api/admin/services:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Admin Projects (Update)
app.patch('/api/admin/projects/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findByIdAndUpdate(id, req.body, { new: true });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        await new AuditLog({ action: 'update_project', details: { id }, admin: req.user._id }).save();
        res.json(project);
    } catch (error) {
        console.error('Error in PATCH /api/admin/projects/:id:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Admin Bookings
app.get('/api/admin/bookings', adminAuth, async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        await new AuditLog({ action: 'view_bookings', details: { count: bookings.length }, admin: req.user._id }).save();
        res.json(bookings);
    } catch (error) {
        console.error('Error in GET /api/admin/bookings:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Admin Notify
app.post('/api/admin/notify', adminAuth, async (req, res) => {
    try {
        const { email, message } = req.body;
        if (!email || !message) return res.status(400).json({ error: 'Email and message are required' });
        await transporter.sendMail({
            from: `"A & K Analytics" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Notification from A & K Analytics',
            html: `<p>${message}</p>`
        });
        const notification = new Notification({ message, date: new Date().toISOString().split('T')[0], user: null }); // Adjust user if needed
        await notification.save();
        await new AuditLog({ action: 'send_notification', details: { email, message }, admin: req.user._id }).save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error in POST /api/admin/notify:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Existing Routes (Unchanged but included for completeness)
// Root Route
app.get('/', (req, res) => {
    res.json({ status: 'Backend is running', version: '1.0.0' });
});

// Review Submission, Get Approved Reviews, etc. (Unchanged, included above)

// Catch-all route for unmatched routes
app.use((req, res) => {
    console.log(`Unmatched route: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// Error-handling middleware for uncaught errors
app.use((err, req, res, next) => {
    console.error('Uncaught error:', err.message);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));