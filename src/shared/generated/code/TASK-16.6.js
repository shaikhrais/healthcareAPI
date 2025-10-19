const express = require('express');

const router = express.Router();

router.get('/TASK-16.6', (req, res) => {
  res.json({
    taskId: 'TASK-16.6',
    title: 'Data import wizard (CSV/Excel)',
    description: 'Implements: Data import wizard (CSV/Excel).',
  });
});

module.exports = router;
