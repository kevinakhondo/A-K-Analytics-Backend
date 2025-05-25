require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customer');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'https://akaana.netlify.app',
    credentials: true
}));

// MongoDB Connection
if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
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
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    dashboardUrl: String,
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

// Authentication Middleware
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        req.user = user;
        req.userId = decoded.userId;
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
        if (token === process.env.ADMIN_TOKEN) {
            console.log('Admin authenticated via ADMIN_TOKEN');
            return next();
        }
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not defined');
            return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user.email.includes('kevinakhondo9@gmail.com')) {
            return res.status(403).json({ error: 'Unauthorized: Admin access only' });
        }
        req.user = user;
        req.userId = decoded.userId;
        console.log('Admin authenticated via JWT:', user.email);
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error.message);
        res.status(401).json({ error: 'Invalid token: ' + error.message });
    }
};

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/customer', customerRoutes);

// Review Routes
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
        console.error('Error in POST /api/reviews:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error in GET /api/reviews:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.get('/api/reviews/user/:name', authMiddleware, async (req, res) => {
    try {
        const name = req.params.name;
        if (req.user.name !== name && !req.user.email.includes('kevinakhondo9@gmail.com')) {
            return res.status(403).json({ error: 'Unauthorized to view these reviews' });
        }
        const reviews = await Review.find({ name }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error in GET /api/reviews/user/:name:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.get('/api/reviews/pending', adminAuth, async (req, res) => {
    try {
        const count = await Review.countDocuments({ approved: false });
        res.json({ count });
    } catch (error) {
        console.error('Error in GET /api/reviews/pending:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.get('/api/reviews/all', adminAuth, async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error in GET /api/reviews/all:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.patch('/api/reviews/:id', adminAuth, async (req, res) => {
    try {
        const { approved } = req.body;
        const review = await Review.findByIdAndUpdate(req.params.id, { approved }, { new: true });
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json({ message: 'Review updated', review });
    } catch (error) {
        console.error('Error in PATCH /api/reviews/:id:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Booking Routes
app.post('/api/bookings', authMiddleware, async (req, res) => {
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
            status: status || 'pending',
            user: req.user._id
        });
        await booking.save();
        req.user.bookings.push(booking._id);
        await req.user.save();
        await transporter.sendMail({
            from: `"A & K Analytics" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Booking Confirmation',
            html: `
                <h2>Booking Confirmed!</h2>
                <p>Dear ${name},</p>
                <p>Your booking for ${service} on ${date} at ${time} has been received.</p>
                <p>Status: ${status || 'pending'}</p>
                <p>We'll notify you once it's confirmed.</p>
            `
        });
        const notification = new Notification({
            message: `Booking for ${service} on ${date} received`,
            date: new Date().toISOString().split('T')[0],
            user: req.user._id
        });
        await notification.save();
        req.user.notifications.push(notification._id);
        await req.user.save();
        res.status(201).json({ message: 'Booking created successfully', booking });
    } catch (error) {
        console.error('Error in POST /api/bookings:', error.message);
        res.status(500).json({ error: 'Failed to create booking: ' + error.message });
    }
});

app.get('/api/bookings', adminAuth, async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error in GET /api/bookings:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

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
        await transporter.sendMail({
            from: `"A & K Analytics" <${process.env.EMAIL_USER}>`,
            to: booking.email,
            subject: 'Booking Status Update',
            html: `
                <h2>Booking Update</h2>
                <p>Dear ${booking.name},</p>
                <p>Your booking for ${booking.service} on ${booking.date} at ${booking.time} has been updated.</p>
                <p>New Status: ${status}</p>
            `
        });
        const notification = new Notification({
            message: `Booking status updated to ${status}`,
            date: new Date().toISOString().split('T')[0],
            user: booking.user
        });
        await notification.save();
        const user = await User.findById(booking.user);
        if (user) {
            user.notifications.push(notification._id);
            await user.save();
        }
        res.json({ message: 'Booking status updated', booking });
    } catch (error) {
        console.error('Error in PATCH /api/bookings/:id:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Support Ticket Routes
app.get('/api/support-tickets', adminAuth, async (req, res) => {
    try {
        const tickets = await SupportTicket.find().populate('user').sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        console.error('Error in GET /api/support-tickets:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.patch('/api/support-tickets/:id', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }
        const ticket = await SupportTicket.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!ticket) {
            return res.status(404).json({ error: 'Support ticket not found' });
        }
        const notification = new Notification({
            message: `Support ticket "${ticket.subject}" status updated to ${status}`,
            date: new Date().toISOString().split('T')[0],
            user: ticket.user
        });
        await notification.save();
        const user = await User.findById(ticket.user);
        if (user) {
            user.notifications.push(notification._id);
            await user.save();
        }
        res.json({ message: 'Support ticket status updated', ticket });
    } catch (error) {
        console.error('Error in PATCH /api/support-tickets/:id:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Root Route
app.get('/', (req, res) => {
    res.json({ status: 'Backend is running', version: '1.0.0' });
});

// Catch-all Route
app.use((req, res) => {
    console.log(`Unmatched route: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// Error-handling Middleware
app.use((err, req, res, next) => {
    console.error('Uncaught error:', err.message);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));