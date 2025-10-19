const express = require('express');

const router = express.Router();

router.get('/TASK-5.10', (req, res) => {
  res.json({
    taskId: 'TASK-5.10',
    title: 'Calendar syncing (Google/Outlook)',
    description: 'Implements: Calendar syncing (Google/Outlook).',
  });
});

module.exports = router;
