const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Project', ProjectSchema);