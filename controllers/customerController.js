const User = require('../models/User');

exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ dashboardUrl: user.dashboardUrl || 'https://public.tableau.com/views/SuperstoreOverview/Dashboard1' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        // Mock analytics; replace with actual logic if needed
        const analytics = [{ _id: '1', title: 'Sample Report', status: 'Completed', resultsUrl: 'https://public.tableau.com/views/SuperstoreOverview/Dashboard1' }];
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load analytics' });
    }
};