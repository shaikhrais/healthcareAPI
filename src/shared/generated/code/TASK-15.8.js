const express = require('express');

const router = express.Router();

router.get('/TASK-15.8', (req, res) => {
  res.json({
    taskId: 'TASK-15.8',
    title: 'Outlook Calendar sync',
    description: 'Implements: Outlook Calendar sync.',
  });
});

module.exports = router;
