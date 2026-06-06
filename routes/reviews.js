const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const ReviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Review = mongoose.model('Review', ReviewSchema);

router.post('/', async (req, res) => {
  try {
    const { name, text, rating } = req.body;
    if (!name || !text || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'All fields are required and rating must be 1-5' });
    }
    const review = new Review({ name, text, rating });
    await review.save();
    res.status(201).json({ message: 'Review submitted, pending approval' });
  } catch (error) {
    console.error('POST /api/reviews:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('GET /api/reviews:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/user/:name', authMiddleware, async (req, res) => {
  try {
    if (req.user.name !== req.params.name && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const reviews = await Review.find({ name: req.params.name }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('GET /api/reviews/user/:name:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/pending', adminAuth, async (req, res) => {
  try {
    const count = await Review.countDocuments({ approved: false });
    res.json({ count });
  } catch (error) {
    console.error('GET /api/reviews/pending:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', adminAuth, async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('GET /api/reviews/all:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { approved: req.body.approved }, { new: true });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review updated', review });
  } catch (error) {
    console.error('PATCH /api/reviews/:id:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
