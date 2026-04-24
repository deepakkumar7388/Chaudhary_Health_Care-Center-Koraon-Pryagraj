const Setting = require('../models/Setting');

exports.getSettings = async (req, res) => {
    try {
        const settings = await Setting.find();
        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });
        res.status(200).json({ success: true, settings: settingsMap });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = req.body;
        for (const [key, value] of Object.entries(settings)) {
            await Setting.findOneAndUpdate(
                { key },
                { value, updatedAt: Date.now() },
                { upsert: true }
            );
        }
        res.status(200).json({ success: true, message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
