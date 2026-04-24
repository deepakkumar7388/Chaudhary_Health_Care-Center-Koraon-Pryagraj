const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://deepak:Deepak123456@cluster0.evytu0b.mongodb.net/chaudhary_hms_db?retryWrites=true&w=majority';

const roles = [
    { name: 'System Admin', username: 'admin', password: 'admin123', role: 'admin', email: 'admin@hospital.com' },
    { name: 'Dr. Amar Sharma', username: 'doctor', password: 'doctor123', role: 'doctor', email: 'doctor@hospital.com' },
    { name: 'Nurse Priya', username: 'nurse', password: 'nurse123', role: 'staff', email: 'nurse@hospital.com' },
    { name: 'Receptionist Pooja', username: 'reception', password: 'reception123', role: 'receptionist', email: 'reception@hospital.com' }
];

async function seedAll() {
    try {
        await mongoose.connect(uri);
        console.log("Connected to Atlas for seeding...");

        for (const r of roles) {
            await User.deleteOne({ username: r.username });
            const newUser = new User({
                name: r.name,
                email: r.email,
                mobile: '9876543210',
                username: r.username,
                password: r.password,
                role: r.role,
                status: 'active'
            });
            await newUser.save();
            console.log(`Created ${r.role}: ${r.username}`);
        }
        
        console.log("\nALL TEST USERS CREATED SUCCESSFULLY!");
    } catch (err) {
        console.error('FAILED:', err.message);
    } finally {
        process.exit(0);
    }
}

seedAll();
