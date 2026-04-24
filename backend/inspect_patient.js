const mongoose = require('mongoose');
const uri = 'mongodb+srv://deepak:Deepak123456@cluster0.evytu0b.mongodb.net/chaudhary_hms_db?retryWrites=true&w=majority';

async function checkPatient() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const patient = await db.collection('patients').findOne({});
    console.log('Patient structure:', JSON.stringify(patient, null, 2));
    process.exit(0);
}

checkPatient();
