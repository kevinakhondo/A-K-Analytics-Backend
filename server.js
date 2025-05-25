const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Enable CORS
app.use(cors({
    origin: 'https://akaana.netlify.app',
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/akanalytics', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/customer', customerRoutes);

// Root Route
app.get('/', (req, res) => {
    res.json({ status: 'Test Backend is running', version: '1.0.0' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});