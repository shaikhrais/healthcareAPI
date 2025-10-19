const express = require('express');

const router = express.Router();

router.get('/TASK-17.13', (req, res) => {
  res.json({
    taskId: 'TASK-17.13',
    title: 'Bug Prioritization & Triage',
    description: 'Severity & SLA tagging.',
  });
});

module.exports = router;
