const User = require('../models/User');
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');
const DailyNote = require('../models/DailyNote');
const Discharge = require('../models/Discharge');
const Setting = require('../models/Setting');
const FCMToken = require('../models/FCMToken');
const { cloudinary, configureCloudinary } = require('../config/cloudinary');

const MODELS_MAP = {
    users: User,
    patients: Patient,
    billings: Billing,
    dailyNotes: DailyNote,
    discharges: Discharge,
    settings: Setting,
    fcmTokens: FCMToken
};

/**
 * Query all collections and upload as a JSON backup to Cloudinary.
 */
async function createBackup() {
    await configureCloudinary();

    const backupData = {};
    let totalRecords = 0;

    for (const [key, Model] of Object.entries(MODELS_MAP)) {
        const data = await Model.find({}).lean();
        backupData[key] = data;
        totalRecords += data.length;
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    // Encode total records count in the filename for easy retrieval during listing
    const filename = `backups/backup_${timestamp}_records-${totalRecords}.json`;

    const jsonString = JSON.stringify(backupData, null, 2);

    // Upload raw JSON file to Cloudinary
    await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { 
                resource_type: "raw", 
                public_id: filename 
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(Buffer.from(jsonString));
    });

    // Update last backup timestamp in DB Settings
    await Setting.findOneAndUpdate(
        { key: 'last-backup-time' },
        { value: new Date().toISOString(), updatedAt: Date.now() },
        { upsert: true }
    );

    // Run clean up of old backups asynchronously
    autoCleanOldBackups().catch(err => {
        console.error('Failed to auto-clean old backups:', err.message);
    });

    return {
        filename: filename.replace('backups/', ''),
        recordCount: totalRecords
    };
}

/**
 * List all backups stored in Cloudinary.
 */
async function listBackups() {
    await configureCloudinary();

    const listResult = await cloudinary.api.resources({
        resource_type: "raw",
        type: "upload",
        prefix: "backups/",
        max_results: 500
    });

    const backupFiles = listResult.resources
        .filter(r => r.public_id.endsWith('.json'))
        .map(r => {
            const fullName = r.public_id.replace('backups/', '');
            // Extract record count from filename format: backup_TIMESTAMP_records-N.json
            const recordCountMatch = r.public_id.match(/_records-(\d+)\.json$/);
            const recordCount = recordCountMatch ? parseInt(recordCountMatch[1]) : 0;
            
            // User-friendly display name (strip the records suffix)
            const cleanName = fullName.replace(/_records-\d+/, '');

            return {
                name: fullName, // Use full name for database actions
                displayName: cleanName,
                size: parseInt(r.bytes || 0),
                createdAt: r.created_at,
                recordCount: recordCount
            };
        });

    // Sort: Newest first
    backupFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return backupFiles;
}

/**
 * Restore database from an uploaded JSON object or downloaded backup file.
 */
async function restoreFromData(backupData) {
    // Validate backup structure
    for (const key of Object.keys(MODELS_MAP)) {
        if (!backupData[key] || !Array.isArray(backupData[key])) {
            throw new Error(`Invalid backup file structure: missing or invalid collection "${key}".`);
        }
    }

    // Execute sequential delete and insert to restore
    for (const [key, Model] of Object.entries(MODELS_MAP)) {
        await Model.deleteMany({});
        if (backupData[key].length > 0) {
            // Bypass document validation to ensure smooth import of legacy/existing records
            await Model.insertMany(backupData[key], { lean: true, validateBeforeSave: false });
        }
    }

    return { success: true };
}

/**
 * Download a backup file from Cloudinary and restore database.
 */
async function restoreBackup(filename) {
    await configureCloudinary();

    // Get resource details to retrieve secure_url
    const resource = await cloudinary.api.resource(`backups/${filename}`, {
        resource_type: "raw"
    });

    const res = await fetch(resource.secure_url);
    if (!res.ok) {
        throw new Error(`Failed to download backup file from Cloudinary: ${res.statusText}`);
    }
    
    const backupData = await res.json();
    return restoreFromData(backupData);
}

/**
 * Delete a backup file from Cloudinary.
 */
async function deleteBackup(filename) {
    await configureCloudinary();

    const deleteResult = await cloudinary.uploader.destroy(`backups/${filename}`, {
        resource_type: "raw"
    });

    if (deleteResult.result !== 'ok') {
        throw new Error(`Failed to delete backup file: ${deleteResult.result}`);
    }
    return { success: true };
}

/**
 * Automatically delete backups older than 30 days from Cloudinary.
 */
async function autoCleanOldBackups() {
    await configureCloudinary();

    const listResult = await cloudinary.api.resources({
        resource_type: "raw",
        type: "upload",
        prefix: "backups/",
        max_results: 500
    });

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    for (const r of listResult.resources) {
        if (!r.public_id.endsWith('.json')) continue;

        const createdAt = new Date(r.created_at).getTime();

        if ((now - createdAt) > THIRTY_DAYS_MS) {
            console.log(`Auto-deleting backup file older than 30 days from Cloudinary: ${r.public_id}`);
            await cloudinary.uploader.destroy(r.public_id, {
                resource_type: "raw"
            }).catch(err => {
                console.error(`Failed to delete old backup file ${r.public_id} from Cloudinary:`, err.message);
            });
        }
    }
}

/**
 * Check if 24 hours have passed since the last backup and run auto-backup.
 */
async function checkAndRunAutoBackup() {
    try {
        const lastBackupSetting = await Setting.findOne({ key: 'last-backup-time' });
        const now = new Date();
        let shouldBackup = false;

        if (!lastBackupSetting || !lastBackupSetting.value) {
            shouldBackup = true;
        } else {
            const lastBackupTime = new Date(lastBackupSetting.value);
            const timeDiff = now.getTime() - lastBackupTime.getTime();
            const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

            if (timeDiff >= TWENTY_FOUR_HOURS_MS) {
                shouldBackup = true;
            }
        }

        if (shouldBackup) {
            console.log('🔄 Triggering scheduled automatic database backup to Cloudinary...');
            const result = await createBackup();
            console.log(`✅ Automatic database backup completed: ${result.filename} (${result.recordCount} records)`);
        } else {
            console.log('📅 Automatic backup is not due yet.');
        }
    } catch (error) {
        console.error('❌ Failed to run automatic backup check:', error.message);
    }
}

module.exports = {
    createBackup,
    listBackups,
    restoreFromData,
    restoreBackup,
    deleteBackup,
    checkAndRunAutoBackup
};
