const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    service: { type: String, required: true, enum: ['basic_report', 'advanced_forecasting', 'ml_model'] },
    callTime: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Booking', BookingSchema);