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