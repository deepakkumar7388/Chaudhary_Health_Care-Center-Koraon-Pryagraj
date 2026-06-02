const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Use Google Public DNS for MongoDB Atlas SRV/TXT record resolution
// Fixes EREFUSED errors on local networks with restrictive DNS servers
const dns = require('dns');
const { Resolver } = require('dns');
const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// Override the default DNS resolution functions used by MongoDB driver
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dns.resolveTxt = (...args) => resolver.resolveTxt(...args);
dns.resolveSrv = (...args) => resolver.resolveSrv(...args);
dns.resolve = (...args) => resolver.resolve(...args);
dns.resolve4 = (...args) => resolver.resolve4(...args);
dns.resolve6 = (...args) => resolver.resolve6(...args);

const authRoutes = require('./src/routes/auth');
const patientRoutes = require('./src/routes/patients');
const billingRoutes = require('./src/routes/billing');
const dailyNoteRoutes = require('./src/routes/dailyNotes');
const dischargeRoutes = require('./src/routes/discharge');
const settingsRoutes = require('./src/routes/settings');
const integrationsRoutes = require('./src/routes/integrations');

const app = express();
const PORT = process.env.PORT || 5000;
console.log("\x1b[31m%s\x1b[0m", "HMS Server Version: 2.0 - Transfer Ready");

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        callback(null, true);
    },
    credentials: true // Allow cookies to be sent with requests
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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
app.use('/api/integrations', integrationsRoutes);

// Database Connection with Retry Logic
let lastDbError = null;
let cleanupScheduled = false;

const connectDb = () => {
    console.log('Connecting to MongoDB...');
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('MongoDB Connected successfully');
            lastDbError = null;

            if (!cleanupScheduled) {
                cleanupScheduled = true;
                // Start User Cleanup Job
                const User = require('./src/models/User');
                const runUserCleanup = async () => {
                    try {
                        const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
                        const result = await User.deleteMany({
                            status: 'pending',
                            createdAt: { $lt: threshold }
                        });
                        if (result.deletedCount > 0) {
                            console.log(`[Cleanup] Deleted ${result.deletedCount} pending user(s) older than 24 hours.`);
                        }
                    } catch (err) {
                        console.error('[Cleanup] User cleanup error:', err);
                    }
                };

                // Run cleanup on startup and schedule it hourly
                runUserCleanup();
                setInterval(runUserCleanup, 3600000);
            }
        })
        .catch(err => {
            console.error('MongoDB Connection Error:', err.message);
            lastDbError = err.message;
            console.log('Retrying connection in 5 seconds...');
            setTimeout(connectDb, 5000);
        });
};

connectDb();

// API Ping
app.get('/api/ping', (req, res) => {
    res.status(200).send('pong');
});

// Database Status Endpoint
app.get('/api/db-status', (req, res) => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    const readyState = mongoose.connection.readyState;
    res.status(200).json({
        readyState,
        status: states[readyState] || 'unknown',
        error: lastDbError
    });
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
