const mongoose = require('mongoose');
const Setting = require('./src/models/Setting');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function inspectSettings() {
    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB...");

        const settings = await Setting.find();
        console.log("All Settings:");
        settings.forEach(s => {
            const val = typeof s.value === 'string' ? s.value.substring(0, 100) : JSON.stringify(s.value);
            console.log(`Key: ${s.key}, Value: ${val}...`);
        });

    } catch (err) {
        console.error('FAILED:', err.message);
    } finally {
        mongoose.connection.close();
    }
}

inspectSettings();
