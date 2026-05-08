const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, checkRole } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// IMPORTANT: Specific named routes MUST come before parameterized /:id routes
router.get('/available-beds', authenticate, patientController.getAvailableBeds);
router.get('/trash', authenticate, checkRole(['admin']), patientController.getDeletedPatients);

// General routes
router.get('/', authenticate, patientController.getPatients);
router.post('/', authenticate, patientController.createPatient);

// Parameterized routes (MUST be last to avoid catching named routes)
router.post('/transfer', authenticate, patientController.transferBed);
router.get('/:id', authenticate, patientController.getPatientById);
router.put('/:id', authenticate, patientController.updatePatient);
router.delete('/:id', authenticate, checkRole(['admin']), patientController.deletePatient);
router.post('/:id/restore', authenticate, checkRole(['admin']), patientController.restorePatient);
router.post('/:id/upload-files', authenticate, upload.array('files'), patientController.uploadPatientFiles);
router.post('/:id/surgeries', authenticate, patientController.addSurgery);

module.exports = router;
