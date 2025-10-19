const express = require('express');

const router = express.Router();

router.get('/TASK-6.22', (req, res) => {
  res.json({
    taskId: 'TASK-6.22',
    title: 'Pre-appointment forms',
    description: 'Implements: Pre-appointment forms.',
  });
});

module.exports = router;
