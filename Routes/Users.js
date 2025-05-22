const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

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
            profileCompletion: user.profileCompletion,
            projects: user.projects,
            analytics: [{ title: 'Sales Forecast Q2', previewUrl: 'https://tableau.com/preview', kpis: 'Accuracy: 93%' }], // Placeholder
            bookings: user.bookings,
            supportTickets: user.supportTickets,
            invoices: user.invoices,
            notifications: user.notifications,
            preferences: {
                name: user.name,
                email: user.email,
                company: user.company,
                notificationChannels: user.notificationChannels
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;