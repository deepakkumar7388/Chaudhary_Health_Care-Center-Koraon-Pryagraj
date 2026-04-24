const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const auth = require('../middleware/auth');

router.get('/', auth, patientController.getPatients);
router.get('/:id', auth, patientController.getPatientById);
router.post('/', auth, patientController.createPatient);
router.put('/:id', auth, patientController.updatePatient);
router.delete('/:id', auth, patientController.deletePatient);
router.post('/:id/surgeries', auth, patientController.addSurgery);

module.exports = router;
