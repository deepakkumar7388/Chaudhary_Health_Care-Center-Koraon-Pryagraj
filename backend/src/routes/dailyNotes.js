const express = require('express');
const router = express.Router();
const dailyNoteController = require('../controllers/dailyNoteController');
const { authenticate } = require('../middleware/auth');

router.get('/:patientId', authenticate, dailyNoteController.getNotesByPatient);
router.post('/:patientId', authenticate, dailyNoteController.addNote);
router.put('/:id', authenticate, dailyNoteController.updateNote);

module.exports = router;
