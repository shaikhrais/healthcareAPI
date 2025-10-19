const express = require('express');

const router = express.Router();

router.get('/TASK-17.12', (req, res) => {
  res.json({
    taskId: 'TASK-17.12',
    title: 'Beta Clinic UAT Sessions',
    description: 'UAT with feedback loop.',
  });
});

module.exports = router;
