const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Completed'], default: 'Pending' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Booking', bookingSchema);