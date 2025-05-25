const express = require('express');
const router = express.Router(); // Define router here
const authMiddleware = require('../middleware/auth');
const customerController = require('../controllers/customerController');
const Booking = require('../models/Booking');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.get('/dashboard', authMiddleware, customerController.getDashboard || ((req, res) => {
    res.json({ dashboardUrl: 'https://example.com/dashboard' });
}));

router.get('/analytics', authMiddleware, customerController.getAnalytics || ((req, res) => {
    res.json([
        { _id: '1', title: 'Report 1', status: 'Completed', resultsUrl: 'https://example.com/report1' }
    ]);
}));

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
        const filename = req.file.filename;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Save file metadata to user
        user.uploadedFiles.push({
            filename: req.file.filename,
            originalName: req.file.originalname,
            uploadDate: new Date()
        });
        await user.save();

        // Trigger processing
        const filePath = path.join('uploads', req.file.filename);
        exec(`python3 analyze.py ${filePath}`, async (err) => {
            if (err) {
                console.error('Automation error:', err.message);
                return res.status(500).json({ error: 'Processing failed' });
            }
            // Update user with processed file
            user.uploadedFiles = user.uploadedFiles.map(file => 
                file.filename === req.file.filename 
                ? { ...file, processed: true, processedFileUrl: `/uploads/${req.file.filename}.processed.csv` } 
                : file
            );
            await user.save();
            res.json({ message: 'File uploaded and processing started', fileUrl: `/uploads/${req.file.filename}` });
        });
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
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Save DB connection details
        user.dbConnections.push({ dbType, host, port, database, username, password });
        await user.save();

        // Connect to DB (example for PostgreSQL)
        const dbClient = require(`pg`);
        const client = new dbClient.Client({
            host,
            port,
            database,
            user: username,
            password
        });
        await client.connect();
        await client.query('SELECT NOW()');
        await client.end();

        res.json({ message: 'Database connection successful' });
    } catch (error) {
        console.error('Error in POST /api/customer/db-connect:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

module.exports = router;