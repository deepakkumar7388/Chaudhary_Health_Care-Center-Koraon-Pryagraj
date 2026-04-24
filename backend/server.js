const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');
const patientRoutes = require('./src/routes/patients');
const billingRoutes = require('./src/routes/billing');
const dailyNoteRoutes = require('./src/routes/dailyNotes');
const dischargeRoutes = require('./src/routes/discharge');
const settingsRoutes = require('./src/routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/notes', dailyNoteRoutes);
app.use('/api/discharge', dischargeRoutes);
app.use('/api/settings', settingsRoutes);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected successfully'))
    .catch(err => console.log('MongoDB Connection Error:', err));

app.get('/', (req, res) => {
    res.send('Hospital Management System API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
