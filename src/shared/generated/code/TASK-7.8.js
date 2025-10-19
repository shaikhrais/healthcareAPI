const express = require('express');

const router = express.Router();

router.get('/TASK-7.8', (req, res) => {
  res.json({
    taskId: 'TASK-7.8',
    title: 'Medication ordering',
    description: 'Implements: Medication ordering.',
  });
});

module.exports = router;
