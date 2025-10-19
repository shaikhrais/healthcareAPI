const express = require('express');

const router = express.Router();

router.get('/TASK-5.7', (req, res) => {
  res.json({
    taskId: 'TASK-5.7',
    title: 'Automated reminders (SMS/email)',
    description: 'Implements: Automated reminders (SMS/email).',
  });
});

module.exports = router;
