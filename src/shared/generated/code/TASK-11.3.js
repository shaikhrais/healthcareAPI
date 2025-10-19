const express = require('express');

const router = express.Router();

router.get('/TASK-11.3', (req, res) => {
  res.json({
    taskId: 'TASK-11.3',
    title: 'Clinical Outcome Reports',
    description: 'Outcomes & cohorts.',
  });
});

module.exports = router;
