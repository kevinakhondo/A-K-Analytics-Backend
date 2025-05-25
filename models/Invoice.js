const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issuedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);