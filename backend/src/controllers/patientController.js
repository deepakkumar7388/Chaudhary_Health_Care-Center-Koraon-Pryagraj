const Patient = require('../models/Patient');

exports.getPatients = async (req, res) => {
    try {
        const patients = await Patient.find().sort({ admission_date: -1 });
        res.status(200).json({ success: true, patients });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPatientById = async (req, res) => {
    try {
        const patient = await Patient.findOne({ patient_id: req.params.id });
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
            { patient_id: req.params.id },
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
        const patient = await Patient.findOneAndDelete({ patient_id: req.params.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        res.status(200).json({ success: true, message: 'Patient deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addSurgery = async (req, res) => {
    try {
        const patient = await Patient.findOne({ patient_id: req.params.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        
        patient.surgeries.push(req.body);
        await patient.save();
        res.status(200).json({ success: true, surgeries: patient.surgeries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
