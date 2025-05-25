const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema({
    title: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'open' }
});

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);