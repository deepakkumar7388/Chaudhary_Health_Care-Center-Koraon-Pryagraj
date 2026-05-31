const DailyNote = require('../models/DailyNote');
const Patient = require('../models/Patient');

exports.getNotesByPatient = async (req, res) => {
    try {
        const notes = await DailyNote.find({ patient_id: req.params.patientId }).sort({ date: 1, time: 1 });
        res.status(200).json({ success: true, notes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addNote = async (req, res) => {
    try {
        const patient = await Patient.findOne({ patient_id: req.params.patientId, isDeleted: false });
        if (patient && patient.status === 'Discharged') {
            return res.status(400).json({ success: false, message: 'Cannot add clinical notes for a discharged patient' });
        }

        const newNote = new DailyNote({ ...req.body, patient_id: req.params.patientId });
        await newNote.save();
        res.status(201).json({ success: true, note: newNote });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateNote = async (req, res) => {
    try {
        const note = await DailyNote.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
        res.status(200).json({ success: true, note });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
