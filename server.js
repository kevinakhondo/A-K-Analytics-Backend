require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customer');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'https://akaana.netlify.app',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// File upload configuration
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

app.use(cors({
    origin: 'https://akaana.netlify.app',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
  });

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('join', ({ userId, role }) => {
        socket.join(userId);
        console.log(`${role} ${userId} joined`);
    });
    socket.on('message', (data) => {
        io.to(data.userId || socket.id).emit('message', {
            sender: data.sender,
            text: data.text
        });
    });
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

app.use('/api/users', userRoutes);
app.use('/api/customer', customerRoutes);

// File upload route (temporary example)
app.post('/api/customer/upload', upload.single('data'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Trigger automation script (e.g., Python script for ETL/EDA)
    const exec = require('child_process').exec;
    exec(`python3 analyze.py ${path.join('uploads', req.file.filename)}`, (err) => {
        if (err) {
            console.error('Automation error:', err);
            return res.status(500).json({ error: 'Processing failed' });
        }
        res.json({ message: 'File uploaded and processing started', fileUrl: `/uploads/${req.file.filename}` });
    });
});

app.get('/', (req, res) => res.json({ status: 'Backend is running', version: '1.0.0' }));
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` }));
app.use((err, req, res, next) => {
    console.error('Uncaught error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));