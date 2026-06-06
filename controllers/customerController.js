const User = require('../models/User');
const fs = require('fs');

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('dashboardUrl uploadedFiles');
    if (!user) return res.status(404).json({ error: 'User not found' });

    let dashboardUrl = user.dashboardUrl;
    const processedFiles = user.uploadedFiles.filter(f => f.processed && f.processedFileUrl);
    if (processedFiles.length > 0) {
      const latest = processedFiles.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))[0];
      dashboardUrl = latest.processedFileUrl;
    }

    res.json({ dashboardUrl });
  } catch (error) {
    console.error('Error in getDashboard:', error.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('analyticsReports uploadedFiles');
    if (!user) return res.status(404).json({ error: 'User not found' });

    let analytics = user.analyticsReports || [];
    const processedFiles = user.uploadedFiles.filter(f => f.processed && f.processedFileUrl);
    processedFiles.forEach(file => {
      if (!analytics.find(r => r.resultsUrl === file.processedFileUrl)) {
        analytics.push({
          _id: file._id.toString(),
          title: `Analysis of ${file.originalName}`,
          status: 'Completed',
          resultsUrl: file.processedFileUrl,
          createdAt: file.uploadDate,
        });
      }
    });

    if (analytics.length === 0) {
      analytics = [{ _id: '1', title: 'Sample Report', status: 'Completed', resultsUrl: 'https://public.tableau.com/views/SuperstoreOverview/Dashboard1' }];
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error in getAnalytics:', error.message);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
};
