require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node seed-admin.js <email> <password>');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    let user = await User.findOne({ email });

    if (user) {
      user.role = 'admin';
      user.isVerified = true;
      await user.save();
      console.log(`✓ Existing user ${user.email} (${user.name}) promoted to admin.`);
    } else {
      const hashed = await bcrypt.hash(password, 10);
      user = await User.create({
        name: 'Admin',
        email,
        password: hashed,
        role: 'admin',
        isVerified: true,
      });
      console.log(`✓ Admin account created: ${user.email}`);
    }

    console.log('  Log in at: https://magical-moxie-c216f8.netlify.app/login.html');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err.message);
    process.exit(1);
  });
