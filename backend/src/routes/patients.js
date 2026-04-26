const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, checkRole } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticate, patientController.getPatients);
router.get('/available-beds', authenticate, patientController.getAvailableBeds);
router.get('/trash', authenticate, checkRole(['admin']), patientController.getDeletedPatients);
router.get('/:id', authenticate, patientController.getPatientById);
router.post('/', authenticate, patientController.createPatient);
router.put('/:id', authenticate, patientController.updatePatient);
router.delete('/:id', authenticate, checkRole(['admin']), patientController.deletePatient);
router.post('/:id/restore', authenticate, checkRole(['admin']), patientController.restorePatient);
router.post('/:id/upload-files', authenticate, upload.array('files'), patientController.uploadPatientFiles);
router.post('/:id/surgeries', authenticate, patientController.addSurgery);

module.exports = router;
