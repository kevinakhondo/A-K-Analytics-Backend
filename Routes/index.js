const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for the frontend origin
app.use(cors({
    origin: 'https://akaana.netlify.app', // Allow only this origin
    credentials: true // Allow cookies/auth headers if needed
}));

// Middleware for parsing JSON
app.use(express.json());

// Your existing middleware (e.g., authMiddleware)
// ...

// Your existing routes, including:
app.get('/api/users/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('projects')
            .populate('bookings')
            .populate('supportTickets')
            .populate('invoices')
            .populate('notifications');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            name: user.name,
            email: user.email,
            role: user.role || (user.email === 'kevinakhondo9@gmail.com' ? 'admin' : 'customer'),
            profileCompletion: user.profileCompletion,
            projects: user.projects || [],
            analytics: [{ title: 'Sales Forecast Q2', previewUrl: 'https://tableau.com/preview', kpis: 'Accuracy: 93%' }],
            bookings: user.bookings || [],
            supportTickets: user.supportTickets || [],
            invoices: user.invoices || [],
            notifications: user.notifications || [],
            preferences: {
                name: user.name,
                email: user.email,
                company: user.company,
                notificationChannels: user.notificationChannels
            }
        });
    } catch (error) {
        console.error('Error in GET /api/users/profile:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Other routes (e.g., /api/users/login, /api/users/signup)
// ...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});