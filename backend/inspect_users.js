const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function inspect() {
    try {
        await mongoose.connect(uri);
        const users = await User.find({}, 'username email name');
        console.log('--- Current Users in Database ---');
        users.forEach(u => {
            console.log(`Username: ${u.username} | Email: ${u.email} | Name: ${u.name}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

inspect();
