require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Allow all origins for testing

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

// Root route
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
        console.error('Error in POST /api/reviews:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get approved reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error in GET /api/reviews:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin authentication middleware
const adminAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Get all reviews (admin)
app.get('/api/reviews/all', adminAuth, async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error in GET /api/reviews/all:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update review approval (admin)
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));