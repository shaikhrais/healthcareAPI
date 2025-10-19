const express = require('express');

const router = express.Router();

router.get('/TASK-8.12', (req, res) => {
  res.json({
    taskId: 'TASK-8.12',
    title: 'Clinical data export',
    description: 'Implements: Clinical data export.',
  });
});

module.exports = router;
