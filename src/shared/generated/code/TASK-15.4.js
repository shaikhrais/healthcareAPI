const express = require('express');

const router = express.Router();

router.get('/TASK-15.4', (req, res) => {
  res.json({ taskId: 'TASK-15.4', title: 'e-Prescribing', description: 'Surescripts; formulary.' });
});

module.exports = router;
