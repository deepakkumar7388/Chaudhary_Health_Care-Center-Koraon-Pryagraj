const cloudinary = require('cloudinary').v2;
const Setting = require('../models/Setting');

// Helper function to get Cloudinary settings and configure it
async function configureCloudinary() {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;

    try {
        const cloudNameSetting = await Setting.findOne({ key: 'cloudinary-cloud-name' });
        const apiKeySetting = await Setting.findOne({ key: 'cloudinary-api-key' });
        const apiSecretSetting = await Setting.findOne({ key: 'cloudinary-api-secret' });

        if (cloudNameSetting && cloudNameSetting.value) cloudName = cloudNameSetting.value;
        if (apiKeySetting && apiKeySetting.value) apiKey = apiKeySetting.value;
        if (apiSecretSetting && apiSecretSetting.value) apiSecret = apiSecretSetting.value;
    } catch (err) {
        console.error('Error fetching Cloudinary settings from DB:', err.message);
    }

    if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret
        });
        return true;
    }
    return false;
}

/**
 * Uploads a file (buffer or base64) to Cloudinary
 * @param {Buffer|String} file - The file buffer or base64 data string
 * @param {String} folder - Cloudinary folder name
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadToCloudinary(file, folder = 'hms') {
    const isConfigured = await configureCloudinary();
    if (!isConfigured) {
        throw new Error('Cloudinary is not configured. Please check your credentials in Settings.');
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folder },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        if (Buffer.isBuffer(file)) {
            uploadStream.end(file);
        } else if (typeof file === 'string' && file.startsWith('data:')) {
            // base64 format
            cloudinary.uploader.upload(file, { folder: folder })
                .then(resolve)
                .catch(reject);
        } else {
            reject(new Error('Invalid file format. Must be Buffer or Base64 string.'));
        }
    });
}

module.exports = {
    cloudinary,
    uploadToCloudinary,
    configureCloudinary
};
