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

function getWardType(bedNo) {
    if (!bedNo) return 'General';
    if (bedNo.toUpperCase().includes('ICU')) return 'ICU';
    if (bedNo.toUpperCase().includes('PRIVATE')) return 'Private';
    return 'General';
}

exports.createPatient = async (req, res) => {
    try {
        // ── Step 1: Generate Sequential Patient ID (YYYYMMDD-001) ──
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const datePrefix = `P-${y}${m}${d}`;

        // Count how many patients already exist today
        let countToday = 0;
        try {
            countToday = await Patient.countDocuments({
                patient_id: { $regex: `^${datePrefix}-` }
            });
        } catch (countErr) {
            console.error('[createPatient] countDocuments failed:', countErr.message);
        }

        // Find a unique ID
        let sequentialId = null;
        let seq = countToday + 1;
        for (let attempts = 0; attempts < 100; attempts++) {
            const candidateId = `${datePrefix}-${String(seq).padStart(3, '0')}`;
            try {
                const exists = await Patient.findOne({ patient_id: candidateId });
                if (!exists) {
                    sequentialId = candidateId;
                    break;
                }
            } catch (findErr) {
                console.error('[createPatient] findOne failed:', findErr.message);
                break;
            }
            seq++;
        }

        // Final fallback if all attempts fail
        if (!sequentialId) {
            sequentialId = `${datePrefix}-${String(Date.now()).slice(-4)}`;
        }

        console.log('[createPatient] Final patient_id:', sequentialId);

        // ── Step 2: Build and Save Patient ──
        const bodyData = { ...req.body };
        delete bodyData.patient_id; // Remove any client-sent ID

        const newPatient = new Patient(bodyData);
        newPatient.patient_id = sequentialId;

        // Initialize bed history
        if (newPatient.bed_no) {
            newPatient.bedHistory = [{
                ward_type: getWardType(newPatient.bed_no),
                bed_no: newPatient.bed_no,
                daily_charge: newPatient.wardChargePerDay || 0,
                start_date: newPatient.admission_date || Date.now()
            }];
        }

        await newPatient.save();
        console.log('[createPatient] Saved successfully:', newPatient.patient_id);

        // Send email/push notifications asynchronously in the background
        setTimeout(async () => {
            try {
                const emailNewPatientSetting = await Setting.findOne({ key: 'email-new-patient' });
                const isEmailEnabled = emailNewPatientSetting ? (emailNewPatientSetting.value === true || emailNewPatientSetting.value === 'true') : false;
                
                if (isEmailEnabled) {
                    const User = require('../models/User');
                    const emailService = require('../config/emailService');
                    const staffUsers = await User.find({ role: { $in: ['admin', 'doctor'] }, status: 'active' });
                    let recipientEmails = staffUsers.map(u => u.email).filter(e => e);
                    
                    if (recipientEmails.length === 0) {
                        const emailUserSetting = await Setting.findOne({ key: 'email-user' });
                        const systemSender = emailUserSetting?.value || process.env.EMAIL_USER;
                        if (systemSender) recipientEmails.push(systemSender);
                    }

                    // If patient/guardian email is available, include it
                    if (newPatient.email) {
                        recipientEmails.push(newPatient.email);
                    }

                    // De-duplicate emails
                    recipientEmails = [...new Set(recipientEmails)];

                    for (const toEmail of recipientEmails) {
                        try {
                            await emailService.sendAdmissionEmail(toEmail, newPatient);
                        } catch (mailErr) {
                            console.error(`[Notification] Failed to send admission email to ${toEmail}:`, mailErr.message);
                        }
                    }
                }
            } catch (err) {
                console.error('[Notification] Error in admission email background process:', err.message);
            }

            try {
                const fcmService = require('../config/fcmService');
                await fcmService.broadcastNotification(
                    'New Patient Admitted 🏥',
                    `Patient ${newPatient.name} has been admitted to bed ${newPatient.bed_no || 'N/A'}.`
                );
            } catch (err) {
                console.error('[Notification] Error in FCM admission broadcast:', err.message);
            }
        }, 0);

        res.status(201).json({ success: true, patient: newPatient });
    } catch (error) {
        console.error('[createPatient] ERROR:', error.message, error.stack);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.transferBed = async (req, res) => {
    try {
        const { patient_id, new_bed_no, new_daily_charge, ward_type } = req.body;
        console.log(`[Backend] Transfer Bed Triggered for ID: ${patient_id}`);
        const patient = await Patient.findOne({ patient_id: patient_id, isDeleted: false });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        if (patient.status === 'Discharged') {
            return res.status(400).json({ success: false, message: 'Cannot transfer bed of a discharged patient' });
        }

        // Ensure bedHistory exists
        if (!patient.bedHistory) {
            patient.bedHistory = [];
        }

        // Close the current bed history period
        if (patient.bedHistory.length > 0) {
            const lastBed = patient.bedHistory[patient.bedHistory.length - 1];
            if (!lastBed.end_date) {
                lastBed.end_date = Date.now();
            }
        }

        // Determine new ward type
        const newWardType = ward_type || getWardType(new_bed_no);

        // Add new bed period
        patient.bedHistory.push({
            ward_type: newWardType,
            bed_no: new_bed_no,
            daily_charge: new_daily_charge || patient.wardChargePerDay || 0,
            start_date: Date.now()
        });

        // Update current main bed info
        patient.bed_no = new_bed_no;
        if (new_daily_charge !== undefined) {
            patient.wardChargePerDay = new_daily_charge;
        }
        
        await patient.save();
        res.status(200).json({ success: true, patient });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updatePatient = async (req, res) => {
    try {
        const patient = await Patient.findOne({ patient_id: req.params.id, isDeleted: false });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        if (patient.status === 'Discharged') {
            return res.status(400).json({ success: false, message: 'Cannot edit or modify details of a discharged patient' });
        }

        const oldBedNo = patient.bed_no;
        const newBedNo = req.body.bed_no;

        if (newBedNo && newBedNo !== oldBedNo) {
            // Bed has changed! Let's close the old stay and start a new stay.
            if (!patient.bedHistory) {
                patient.bedHistory = [];
            }
            if (patient.bedHistory.length > 0) {
                const lastBed = patient.bedHistory[patient.bedHistory.length - 1];
                if (!lastBed.end_date) {
                    lastBed.end_date = Date.now();
                }
            }
            // Add new stay
            patient.bedHistory.push({
                ward_type: getWardType(newBedNo),
                bed_no: newBedNo,
                daily_charge: req.body.wardChargePerDay || patient.wardChargePerDay || 0,
                start_date: Date.now()
            });
        }

        // Apply other updates
        Object.assign(patient, req.body);
        await patient.save();

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

        if (patient.status === 'Discharged') {
            return res.status(400).json({ success: false, message: 'Cannot upload files for a discharged patient' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const { uploadToCloudinary, configureCloudinary } = require('../config/cloudinary');
        const hasCloudinary = await configureCloudinary();

        const uploadPromises = req.files.map(async (file) => {
            if (hasCloudinary) {
                try {
                    const cloudRes = await uploadToCloudinary(file.buffer, `hms/patients/${id}`);
                    return cloudRes.secure_url;
                } catch (cloudinaryErr) {
                    console.error('Cloudinary upload error, trying Firebase Storage fallback:', cloudinaryErr.message);
                }
            }

            // Fallback to Firebase Storage
            if (!bucket) {
                throw new Error('Neither Cloudinary nor Firebase Storage is configured.');
            }
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

        if (patient.status === 'Discharged') {
            return res.status(400).json({ success: false, message: 'Cannot add surgery events for a discharged patient' });
        }

        patient.surgeries.push(req.body);
        await patient.save();
        res.status(200).json({ success: true, surgeries: patient.surgeries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
