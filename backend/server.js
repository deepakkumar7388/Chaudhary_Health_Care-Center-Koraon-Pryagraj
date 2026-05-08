const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./src/routes/auth');
const patientRoutes = require('./src/routes/patients');
const billingRoutes = require('./src/routes/billing');
const dailyNoteRoutes = require('./src/routes/dailyNotes');
const dischargeRoutes = require('./src/routes/discharge');
const settingsRoutes = require('./src/routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;
console.log("\x1b[31m%s\x1b[0m", "HMS Server Version: 2.0 - Transfer Ready");

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the frontend (parent directory)
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
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

// API Ping
app.get('/api/ping', (req, res) => {
    res.status(200).send('pong');
});

// SPA fallback - serve index.html for non-API routes
app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '../index.html'));
    } else {
        next();
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log("\x1b[31m%s\x1b[0m", "HMS Server Version: 2.0 - Transfer Ready");

    // Keep-alive cron: Ping self every 14 minutes to prevent Render free tier sleep
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    setInterval(async () => {
        try {
            const res = await fetch(`${RENDER_URL}/api/ping`);
            console.log(`[Keep-Alive] Pinged at ${new Date().toLocaleTimeString()} - Status: ${res.status}`);
        } catch (err) {
            console.log(`[Keep-Alive] Ping failed:`, err.message);
        }
    }, 14 * 60 * 1000); // Every 14 minutes
});
