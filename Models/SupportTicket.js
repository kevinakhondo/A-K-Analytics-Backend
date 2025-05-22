const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);