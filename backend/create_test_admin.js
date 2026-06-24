const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config({ path: './backend/.env' });

async function createTestAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        const email = 'hospitaladmin@test.com';
        const password = 'Admin@123';

        // Check if exists
        let user = await User.findOne({ email });
        if (user) {
            console.log(`User ${email} already exists. Resetting password and making sure role is admin...`);
            user.password = password; // Pre-save hook will hash it
            user.role = 'admin';
            user.status = 'active';
            user.billingAccess = true;
            await user.save();
        } else {
            user = new User({
                name: 'Test Hospital Admin',
                email: email,
                password: password, // Pre-save hook will hash it
                role: 'admin',
                status: 'active',
                billingAccess: true
            });
            await user.save();
        }

        console.log('✅ SUCCESS! Test Admin account is ready.');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createTestAdmin();
