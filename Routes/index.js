const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');
const reviewController = require('../controllers/reviewController');
const bookingController = require('../controllers/bookingController');

router.get('/reviews/pending', auth, restrictTo('admin'), reviewController.getPendingReviews);
router.get('/bookings', auth, restrictTo('admin'), bookingController.getBookings);
router.post('/bookings/confirm/:id', auth, restrictTo('admin'), bookingController.confirmBooking);

module.exports = router;