const express = require('express');

const router = express.Router();

router.get('/TASK-7.13', (req, res) => {
  res.json({
    taskId: 'TASK-7.13',
    title: 'Lab order entry',
    description: 'Implements: Lab order entry.',
  });
});

module.exports = router;
