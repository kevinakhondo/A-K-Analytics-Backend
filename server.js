require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || 'https://akaana.netlify.app',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://akaana.netlify.app',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded files are private — require a valid JWT to download
app.use('/uploads', authMiddleware, express.static('uploads'));

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/signup', authLimiter);

// Database
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined');
  process.exit(1);
}
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => { console.error('MongoDB connection error:', err.message); process.exit(1); });

// Socket.IO — live chat
io.on('connection', (socket) => {
  socket.on('join', ({ userId, role }) => {
    socket.join(userId);
    console.log(`${role} ${userId} joined chat`);
  });
  socket.on('message', (data) => {
    io.to(data.userId || socket.id).emit('message', { sender: data.sender, text: data.text });
  });
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (_req, res) => res.json({ status: 'Backend is running', version: '1.0.0' }));

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` }));

app.use((err, _req, res, _next) => {
  console.error('Uncaught error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
