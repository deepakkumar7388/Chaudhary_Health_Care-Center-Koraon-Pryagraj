// ==================== MAKE DEVELOPER SCRIPT ====================
// Run this ONCE to set your account to 'developer' role
// Usage: node backend/set_developer.js your@email.com

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const email = process.argv[2];
if (!email) {
    console.error('❌ Please provide email: node backend/set_developer.js your@email.com');
    process.exit(1);
}

async function setDeveloper() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        const result = await mongoose.connection.db.collection('users').updateOne(
            { email: email },
            { $set: { role: 'developer', status: 'active', billingAccess: true } }
        );

        if (result.matchedCount === 0) {
            console.error(`❌ No user found with email: ${email}`);
        } else {
            console.log(`✅ SUCCESS! "${email}" is now a Developer (Super Admin).`);
            console.log('   Please logout and login again to see the new Developer Dashboard.');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

setDeveloper();
