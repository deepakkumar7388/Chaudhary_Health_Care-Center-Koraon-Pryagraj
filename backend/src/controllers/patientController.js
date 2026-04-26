const Patient = require('../models/Patient');
const Setting = require('../models/Setting');
const { bucket } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

exports.getAvailableBeds = async (req, res) => {
    console.log('GET /api/patients/available-beds called');
    try {
        // Get all defined beds from settings
        const bedSetting = await Setting.findOne({ key: 'hospital-beds' });
        if (!bedSetting || !bedSetting.value) {
            return res.status(200).json({ success: true, beds: [] });
        }

        const allBeds = bedSetting.value.split(',').map(b => b.trim()).filter(b => b);
        
        // Get currently occupied beds (Admitted patients)
        const occupiedPatients = await Patient.find({ 
            status: 'Admitted', 
            isDeleted: false 
        }).select('bed_no');
        
        const occupiedBeds = occupiedPatients.map(p => p.bed_no);
        
        // Filter out occupied beds
        const availableBeds = allBeds.filter(bed => !occupiedBeds.includes(bed));
        
        res.status(200).json({ success: true, beds: availableBeds });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPatients = async (req, res) => {
    try {
        // Exclude soft-deleted records
        const patients = await Patient.find({ isDeleted: false }).sort({ admission_date: -1 });
        res.status(200).json({ success: true, patients });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getDeletedPatients = async (req, res) => {
    try {
        const patients = await Patient.find({ isDeleted: true }).sort({ admission_date: -1 });
        res.status(200).json({ success: true, patients });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPatientById = async (req, res) => {
    try {
        const patient = await Patient.findOne({ patient_id: req.params.id, isDeleted: false });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        res.status(200).json({ success: true, patient });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createPatient = async (req, res) => {
    try {
        const newPatient = new Patient(req.body);
        await newPatient.save();
        res.status(201).json({ success: true, patient: newPatient });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updatePatient = async (req, res) => {
    try {
        const patient = await Patient.findOneAndUpdate(
            { patient_id: req.params.id, isDeleted: false },
            req.body,
            { new: true }
        );
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        res.status(200).json({ success: true, patient });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deletePatient = async (req, res) => {
    try {
        // Soft delete
        const patient = await Patient.findOneAndUpdate(
            { patient_id: req.params.id },
            { isDeleted: true },
            { new: true }
        );
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        res.status(200).json({ success: true, message: 'Patient soft-deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.restorePatient = async (req, res) => {
    try {
        const patient = await Patient.findOneAndUpdate(
            { patient_id: req.params.id, isDeleted: true },
            { isDeleted: false },
            { new: true }
        );
        if (!patient) return res.status(404).json({ success: false, message: 'Deleted patient not found' });
        res.status(200).json({ success: true, message: 'Patient restored successfully', patient });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.uploadPatientFiles = async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await Patient.findOne({ patient_id: id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const uploadPromises = req.files.map(async (file) => {
            const fileName = `patients/${id}/${uuidv4()}_${file.originalname}`;
            const blob = bucket.file(fileName);
            const blobStream = blob.createWriteStream({
                metadata: { contentType: file.mimetype },
                public: true
            });

            return new Promise((resolve, reject) => {
                blobStream.on('error', (err) => reject(err));
                blobStream.on('finish', () => {
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                    resolve(publicUrl);
                });
                blobStream.end(file.buffer);
            });
        });

        const fileUrls = await Promise.all(uploadPromises);

        // If field 'type' is 'signature', update guardianSignature
        if (req.body.type === 'signature') {
            patient.guardianSignature = fileUrls[0];
        } else {
            patient.documents.push(...fileUrls);
        }

        await patient.save();
        res.status(200).json({ success: true, urls: fileUrls, patient });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addSurgery = async (req, res) => {
    try {
        const patient = await Patient.findOne({ patient_id: req.params.id, isDeleted: false });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        
        patient.surgeries.push(req.body);
        await patient.save();
        res.status(200).json({ success: true, surgeries: patient.surgeries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
