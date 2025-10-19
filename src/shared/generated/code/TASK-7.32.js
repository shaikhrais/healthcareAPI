const express = require('express');

const router = express.Router();

router.get('/TASK-7.32', (req, res) => {
  res.json({
    taskId: 'TASK-7.32',
    title: 'Discharge summaries',
    description: 'Implements: Discharge summaries.',
  });
});

module.exports = router;
