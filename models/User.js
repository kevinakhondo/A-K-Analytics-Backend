const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true, 
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'] 
    },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    createdAt: { type: Date, default: Date.now },
    company: { type: String, trim: true },
    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
    notificationChannels: { 
        type: [String], 
        default: ['Email'], 
        enum: ['Email', 'SMS', 'Push'], // Restrict to specific channels
    },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    supportTickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' }],
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
    dashboardUrl: { type: String, default: 'https://public.tableau.com/views/SuperstoreOverview/Dashboard1' },
    analyticsReports: [{
        _id: { type: String, default: () => Date.now().toString() },
        title: { type: String, required: true },
        status: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Failed'], default: 'Pending' },
        resultsUrl: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    uploadedFiles: [{
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        uploadDate: { type: Date, default: Date.now },
        processed: { type: Boolean, default: false },
        processedFileUrl: { type: String }
    }],
    dbConnections: [{
        dbType: { type: String, enum: ['postgresql', 'mysql', 'mongodb'], required: true },
        host: { type: String, required: true },
        port: { type: Number, required: true },
        database: { type: String, required: true },
        username: { type: String, required: true },
        password: { type: String, required: true }, // Consider encryption
        createdAt: { type: Date, default: Date.now }
    }]
});

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', UserSchema);