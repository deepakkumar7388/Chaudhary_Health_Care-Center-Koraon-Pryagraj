const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middleware/auth');
const backupManager = require('../utils/backupManager');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Protect all backup routes for admin only
router.use(authenticate);
router.use(checkRole(['admin']));

/**
 * GET /api/backup
 * Fetch all backups list from Firebase Storage.
 */
router.get('/', async (req, res) => {
    try {
        const backups = await backupManager.listBackups();
        res.status(200).json({ success: true, backups });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/backup/create
 * Trigger immediate manual database backup.
 */
router.post('/create', async (req, res) => {
    try {
        const result = await backupManager.createBackup();
        res.status(200).json({
            success: true,
            message: `Backup created successfully: ${result.filename}`,
            backup: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/backup/restore/:filename
 * Restore database from a specific file stored in Firebase Storage.
 */
router.post('/restore/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        await backupManager.restoreBackup(filename);
        res.status(200).json({
            success: true,
            message: `Database restored successfully from backup: ${filename}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/backup/restore-upload
 * Restore database by uploading a backup JSON file directly.
 */
router.post('/restore-upload', upload.single('backupFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded. Please upload a JSON backup file.' });
        }

        let backupData;
        try {
            backupData = JSON.parse(req.file.buffer.toString());
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Invalid JSON file format. Make sure it is a valid backup file.' });
        }

        await backupManager.restoreFromData(backupData);
        res.status(200).json({
            success: true,
            message: 'Database restored successfully from uploaded JSON file.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/backup/:filename
 * Delete a specific backup file from Cloudinary.
 */
router.delete('/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        await backupManager.deleteBackup(filename);
        res.status(200).json({
            success: true,
            message: `Backup deleted successfully: ${filename}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/backup/download/:filename
 * Download a backup file from Cloudinary.
 */
router.get('/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const { cloudinary, configureCloudinary } = require('../config/cloudinary');
        await configureCloudinary();

        // Get resource details to retrieve secure_url
        const resource = await cloudinary.api.resource(`backups/${filename}`, {
            resource_type: "raw"
        });

        const response = await fetch(resource.secure_url);
        if (!response.ok) {
            return res.status(response.status).json({ success: false, message: `Failed to fetch backup from Cloudinary: ${response.statusText}` });
        }

        const arrayBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(arrayBuffer));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
