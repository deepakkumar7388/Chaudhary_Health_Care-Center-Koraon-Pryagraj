const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Schema definition (to make script independent)
const settingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now }
});

const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

async function fixBeds() {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        console.error('ERROR: MONGODB_URI not found in .env file');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected successfully!');

        const beds = [];

        // 1. General Ward Male (20 beds)
        for (let i = 1; i <= 20; i++) {
            beds.push(`Male-G${i}`);
        }

        // 2. General Ward Female (20 beds)
        for (let i = 1; i <= 20; i++) {
            beds.push(`Female-G${i}`);
        }

        // 3. ICU Ward (7 beds)
        for (let i = 1; i <= 7; i++) {
            beds.push(`ICU-${i}`);
        }

        // 4. Private Room (5 beds)
        for (let i = 1; i <= 5; i++) {
            beds.push(`Private-${i}`);
        }

        const bedString = beds.join(', ');

        console.log(`Generated ${beds.length} beds.`);
        
        // Update or Create the setting
        const result = await Setting.findOneAndUpdate(
            { key: 'hospital-beds' },
            { 
                value: bedString, 
                updatedAt: new Date() 
            },
            { upsert: true, new: true }
        );

        console.log('--------------------------------------------------');
        console.log('SUCCESS: Hospital beds updated in MongoDB.');
        console.log(`Total Beds: ${beds.length}`);
        console.log('Key: hospital-beds');
        console.log('--------------------------------------------------');
        console.log('You can now refresh your "Add Patient" page.');
        
    } catch (err) {
        console.error('DATABASE ERROR:', err.message);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed.');
    }
}

fixBeds();
