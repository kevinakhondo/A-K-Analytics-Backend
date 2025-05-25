const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const customerController = require('../controllers/customerController');

router.get('/dashboard', authMiddleware, customerController.getDashboard);
router.get('/analytics', authMiddleware, customerController.getAnalytics);

module.exports = router;