const express = require('express');
const router = express.Router();
const path = require('path');
const { execFile } = require('child_process');
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const customerController = require('../controllers/customerController');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { encrypt } = require('../config/crypto');

const ALLOWED_MIMES = new Set([
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${path.basename(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only CSV and Excel files are allowed'));
  },
});

router.get('/dashboard', authMiddleware, customerController.getDashboard);
router.get('/analytics', authMiddleware, customerController.getAnalytics);

router.get('/bookings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('bookings');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.bookings);
  } catch (error) {
    console.error('GET /api/customer/bookings:', error.message);
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
    console.error('POST /api/customer/bookings:', error.message);
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
    console.error('DELETE /api/customer/bookings/:id:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/upload', authMiddleware, upload.single('data'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const savedFilename = req.file.filename;
    const filePath = path.join('uploads', savedFilename);

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.uploadedFiles.push({
      filename: savedFilename,
      originalName: req.file.originalname,
      uploadDate: new Date(),
    });
    await user.save();

    execFile('python3', ['analyze.py', filePath], async (err) => {
      if (err) {
        console.error('Processing error:', err.message);
        return res.status(500).json({ error: 'Processing failed' });
      }
      await User.findByIdAndUpdate(
        req.userId,
        { $set: { 'uploadedFiles.$[el].processed': true, 'uploadedFiles.$[el].processedFileUrl': `/uploads/${savedFilename}.processed.csv` } },
        { arrayFilters: [{ 'el.filename': savedFilename }] }
      );
      res.json({ message: 'File uploaded and processing started', fileUrl: `/uploads/${savedFilename}` });
    });
  } catch (error) {
    console.error('POST /api/customer/upload:', error.message);
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

    user.dbConnections.push({ dbType, host, port, database, username: encrypt(username), password: encrypt(password) });
    await user.save();

    if (dbType === 'postgresql') {
      const { Client } = require('pg');
      const client = new Client({ host, port, database, user: username, password, connectionTimeoutMillis: 5000 });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
    }

    res.json({ message: 'Database connection successful' });
  } catch (error) {
    console.error('POST /api/customer/db-connect:', error.message);
    res.status(500).json({ error: 'Connection failed' });
  }
});

module.exports = router;
