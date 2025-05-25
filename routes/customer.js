// Inside routes/customer.js
router.post('/upload', authMiddleware, upload.single('data'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const filename = req.file.filename;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Save file metadata to user
        user.uploadedFiles.push({
            filename: req.file.filename,
            originalName: req.file.originalname,
            uploadDate: new Date()
        });
        await user.save();

        // Trigger processing
        const filePath = path.join('uploads', req.file.filename);
        exec(`python3 analyze.py ${filePath}`, async (err) => {
            if (err) {
                console.error('Automation error:', err.message);
                return res.status(500).json({ error: 'Processing failed' });
            }
            // Update user with processed file
            user.uploadedFiles = user.uploadedFiles.map(file => 
                file.filename === req.file.filename 
                ? { ...file, processed: true, processedFileUrl: `/uploads/${req.file.filename}.processed.csv` } 
                : file
            );
            await user.save();
            res.json({ message: 'File uploaded and processing started', fileUrl: `/uploads/${req.file.filename}` });
        });
    } catch (error) {
        console.error('Error in POST /api/customer/upload:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/db-connect', authMiddleware, async (req, res) => {
    try {
        const { dbType, host, port, database, username, password } = req.body;
        if (!dbType || !host || !port || !database || !username || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Save DB connection details
        user.dbConnections.push({ dbType, host, port, database, username, password });
        await user.save();

        // Connect to DB (example for PostgreSQL)
        const dbClient = require(`pg`);
        const client = new dbClient.Client({
            host,
            port,
            database,
            user: username,
            password
        });
        await client.connect();
        await client.query('SELECT NOW()');
        await client.end();

        res.json({ message: 'Database connection successful' });
    } catch (error) {
        console.error('Error in POST /api/customer/db-connect:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});