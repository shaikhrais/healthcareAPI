const express = require('express');

const router = express.Router();

router.get('/TASK-5.6', (req, res) => {
  res.json({
    taskId: 'TASK-5.6',
    title: 'Recurring appointments',
    description: 'Implements: Recurring appointments.',
  });
});

module.exports = router;
