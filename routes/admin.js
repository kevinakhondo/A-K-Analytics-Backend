const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Booking = require('../models/Booking');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const Notification = require('../models/Notification');
const transporter = require('../config/email');

router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password -verificationToken');
    res.json(users);
  } catch (error) {
    console.error('GET /api/admin/users:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/users/:id', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password -verificationToken');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('PATCH /api/admin/users/:id:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('GET /api/admin/bookings:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/bookings/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.email) {
      await transporter.sendMail({
        from: `"A & K Analytics" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject: 'Booking Status Update',
        html: `<p>Your booking status has been updated to <strong>${status}</strong>.</p>`,
      });
    }

    if (booking.userId) {
      const notification = new Notification({
        message: `Booking status updated to ${status}`,
        date: new Date().toISOString().split('T')[0],
        user: booking.userId,
      });
      await notification.save();
      await User.findByIdAndUpdate(booking.userId, { $push: { notifications: notification._id } });
    }

    res.json({ message: 'Booking status updated', booking });
  } catch (error) {
    console.error('PATCH /api/admin/bookings/:id:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bookings/:id', adminAuth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId) {
      await User.findByIdAndUpdate(booking.userId, { $pull: { bookings: booking._id } });
    }
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    console.error('DELETE /api/admin/bookings/:id:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/support-tickets', adminAuth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find().populate('user').sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('GET /api/admin/support-tickets:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/support-tickets/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });

    if (ticket.user) {
      const notification = new Notification({
        message: `Support ticket "${ticket.subject}" updated to ${status}`,
        date: new Date().toISOString().split('T')[0],
        user: ticket.user,
      });
      await notification.save();
      await User.findByIdAndUpdate(ticket.user, { $push: { notifications: notification._id } });
    }

    res.json({ message: 'Ticket updated', ticket });
  } catch (error) {
    console.error('PATCH /api/admin/support-tickets/:id:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
