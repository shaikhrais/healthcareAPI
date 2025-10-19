const express = require('express');

const router = express.Router();

router.get('/TASK-12.5', (req, res) => {
  res.json({
    taskId: 'TASK-12.5',
    title: 'Audit & Compliance Reports',
    description: 'HIPAA/PIPEDA reports.',
  });
});

module.exports = router;
