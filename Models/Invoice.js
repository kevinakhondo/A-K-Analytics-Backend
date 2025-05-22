const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    amount: { type: String, required: true },
    date: { type: String, required: true },
    url: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Invoice', invoiceSchema);