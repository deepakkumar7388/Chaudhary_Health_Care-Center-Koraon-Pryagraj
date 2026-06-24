const mongoose = require('mongoose');
require('dotenv').config();
const Setting = require('./src/models/Setting');

async function checkDb() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const settings = await Setting.find({ key: { $regex: 'email' } }).lean();
        console.log("DB Email Settings:", settings);
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkDb();
