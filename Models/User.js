const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    dashboardUrl: String,
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    createdAt: { type: Date, default: Date.now },
    company: { type: String },
    profileCompletion: { type: Number, default: 0 },
    notificationChannels: { type: [String], default: ['Email'] },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    supportTickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' }],
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }]
});

module.exports = mongoose.model('User', UserSchema);