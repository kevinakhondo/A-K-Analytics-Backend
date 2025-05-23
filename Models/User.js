const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    company: { type: String },
    profileCompletion: { type: Number, default: 0 },
    notificationChannels: { type: [String], default: ['Email'] },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    supportTickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' }],
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
    role: { 
        type: String, 
        enum: ['admin', 'customer'], 
        default: 'customer' 
    },
    emailVerified: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

userSchema.index({ email: 1 }); // Ensure efficient queries by email
userSchema.index({ role: 1 }); // Support role-based queries

module.exports = mongoose.model('User', userSchema);