const mongoose = require('mongoose');
const Setting = require('./src/models/Setting');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function seedBeds() {
    try {
        await mongoose.connect(uri);
        console.log("Connected to Atlas for bed seeding...");

        const beds = [];

        // General Ward Male (40 beds)
        for (let i = 1; i <= 40; i++) {
            beds.push(`Male-G${i}`);
        }

        // General Ward Female (40 beds)
        for (let i = 1; i <= 40; i++) {
            beds.push(`Female-G${i}`);
        }

        // ICU Ward (7 beds)
        for (let i = 1; i <= 7; i++) {
            beds.push(`ICU-${i}`);
        }

        // Private Room (5 beds)
        for (let i = 1; i <= 5; i++) {
            beds.push(`Private-${i}`);
        }

        const bedString = beds.join(', ');

        await Setting.findOneAndUpdate(
            { key: 'hospital-beds' },
            { value: bedString, updatedAt: Date.now() },
            { upsert: true }
        );

        console.log(`Successfully seeded ${beds.length} beds into settings.`);
    } catch (err) {
        console.error('FAILED:', err.message);
    } finally {
        mongoose.connection.close();
    }
}

seedBeds();
