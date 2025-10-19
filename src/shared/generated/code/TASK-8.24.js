const express = require('express');

const router = express.Router();

router.get('/TASK-8.24', (req, res) => {
  res.json({
    taskId: 'TASK-8.24',
    title: 'Charge capture from notes',
    description: 'Implements: Charge capture from notes.',
  });
});

module.exports = router;
