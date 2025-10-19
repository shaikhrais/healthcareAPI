const express = require('express');

const router = express.Router();

router.get('/TASK-4.2', (req, res) => {
  res.json({
    taskId: 'TASK-4.2',
    title: 'Communication Preferences',
    description: 'SMS/email/push; language; time windows.',
  });
});

module.exports = router;
