const express = require('express');

const router = express.Router();

router.get('/TASK-11.6', (req, res) => {
  res.json({
    taskId: 'TASK-11.6',
    title: 'Patient demographics reports',
    description: 'Implements: Patient demographics reports.',
  });
});

module.exports = router;
