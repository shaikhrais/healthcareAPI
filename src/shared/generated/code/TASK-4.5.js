const express = require('express');

const router = express.Router();

router.get('/TASK-4.5', (req, res) => {
  res.json({
    taskId: 'TASK-4.5',
    title: 'Patient Activity Timeline',
    description: 'Chronological interactions.',
  });
});

module.exports = router;
