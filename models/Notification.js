const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    read: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notification', NotificationSchema);