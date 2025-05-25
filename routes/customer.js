const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const customerController = require('../controllers/customerController');
const Booking = require('../models/Booking');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.get('/dashboard', authMiddleware, customerController.getDashboard);
router.get('/analytics', authMiddleware, customerController.getAnalytics);

router.get('/bookings', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('bookings');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.bookings);
    } catch (error) {
        console.error('Error in GET /api/customer/bookings:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/bookings', authMiddleware, async (req, res) => {
    try {
        const { service } = req.body;
        if (!service || !['basic_report', 'advanced_forecasting', 'ml_model'].includes(service)) {
            return res.status(400).json({ error: 'Invalid or missing service' });
        }
        const booking = new Booking({ service, userId: req.userId });
        await booking.save();
        await User.findByIdAndUpdate(req.userId, { $push: { bookings: booking._id } });
        res.status(201).json(booking);
    } catch (error) {
        console.error('Error in POST /api/customer/bookings:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/bookings/:id', authMiddleware, async (req, res) => {
    try {
        const booking = await Booking.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        await User.findByIdAndUpdate(req.userId, { $pull: { bookings: req.params.id } });
        res.json({ message: 'Booking cancelled' });
    } catch (error) {
        console.error('Error in DELETE /api/customer/bookings/:id:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/upload', authMiddleware, upload.single('data'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        // Optionally save file metadata to User or process file
        res.json({ message: 'File uploaded successfully', filename: req.file.filename });
    } catch (error) {
        console.error('Error in POST /api/customer/upload:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/db-connect', authMiddleware, async (req, res) => {
    try {
        const { dbType, host, port, database, username, password } = req.body;
        if (!dbType || !host || !port || !database || !username || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // Placeholder: Implement actual DB connection logic
        res.json({ message: 'Database connection successful' });
    } catch (error) {
        console.error('Error in POST /api/customer/db-connect:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;