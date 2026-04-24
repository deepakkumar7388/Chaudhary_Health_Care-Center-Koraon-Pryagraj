const express = require('express');
const router = express.Router();
const dailyNoteController = require('../controllers/dailyNoteController');
const auth = require('../middleware/auth');

router.get('/:patientId', auth, dailyNoteController.getNotesByPatient);
router.post('/:patientId', auth, dailyNoteController.addNote);
router.put('/:id', auth, dailyNoteController.updateNote);

module.exports = router;
