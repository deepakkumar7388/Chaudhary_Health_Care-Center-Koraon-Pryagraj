const mongoose = require('mongoose');
const uri = 'mongodb+srv://deepak:Deepak123456@cluster0.evytu0b.mongodb.net/chaudhary_hms_db?retryWrites=true&w=majority';

async function checkData() {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections in database:', collections.map(c => c.name));
        
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`Collection ${col.name} has ${count} documents`);
        }
    } catch (err) {
        console.error('Error checking data:', err.message);
    } finally {
        process.exit(0);
    }
}

checkData();
