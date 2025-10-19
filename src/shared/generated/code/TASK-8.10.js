const express = require('express');

const router = express.Router();

router.get('/TASK-8.10', (req, res) => {
  res.json({
    taskId: 'TASK-8.10',
    title: 'EHR data import',
    description: 'Implements: EHR data import.',
  });
});

module.exports = router;
