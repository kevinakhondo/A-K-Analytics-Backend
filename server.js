require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: 'https://akanalytics.com' })); // Restrict to your frontend domain

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Review schema
const ReviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    text: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    approved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', ReviewSchema);

// Root route (health check)
app.get('/', (req, res) => {
    res.json({ status: 'Backend is running', version: '1.0.0' });
});

// Submit a review
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
        res.status(500).json({ error: 'Server error' });
    }
});

// Get approved reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all reviews (admin)
app.get('/api/reviews/all', async (req, res) => {
    try {
        // Add authentication in production
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update review approval (admin)
app.patch('/api/reviews/:id', async (req, res) => {
    try {
        // Add authentication in production
        const { approved } = req.body;
        await Review.findByIdAndUpdate(req.params.id, { approved });
        res.json({ message: 'Review updated' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));