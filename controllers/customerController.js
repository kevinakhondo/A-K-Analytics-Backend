const User = require('../models/User');

exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.role !== 'customer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const dashboardUrl = user.dashboardUrl || 'https://public.tableau.com/views/SuperstoreOverview/Dashboard1';
        res.json({ dashboardUrl });
    } catch (error) {
        console.error('Error in getDashboard:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.role !== 'customer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const analytics = [
            {
                _id: '1',
                title: 'Sales Forecast Q2',
                status: 'Completed',
                resultsUrl: 'https://public.tableau.com/views/SuperstoreOverview/Dashboard1',
                kpis: 'Accuracy: 93%'
            }
        ];
        res.json(analytics);
    } catch (error) {
        console.error('Error in getAnalytics:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
};