const express = require('express');
const cors = require('cors');
const app = express();

// Allow requests from Netlify frontend
app.use(cors({ origin: 'https://akaana.netlify.app' }));

// Other middleware and routes
app.use(express.json());
app.use('/api/users', require('./routes/users'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/bookings', require('./routes/bookings'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));