const express = require('express');

const router = express.Router();

router.get('/TASK-17.15', (req, res) => {
  res.json({
    taskId: 'TASK-17.15',
    title: 'QA Sign-off Checklist',
    description: 'Final release sign-off gates.',
  });
});

module.exports = router;
