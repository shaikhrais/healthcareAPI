const express = require('express');

const router = express.Router();

router.get('/TASK-14.2', (req, res) => {
  res.json({ taskId: 'TASK-14.2', title: 'Biometric Auth', description: 'Face/Touch ID login.' });
});

module.exports = router;
