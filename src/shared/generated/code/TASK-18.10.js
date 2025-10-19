const express = require('express');

const router = express.Router();

router.get('/TASK-18.10', (req, res) => {
  res.json({
    taskId: 'TASK-18.10',
    title: 'Marketing & App Stores',
    description: 'Site live; iOS/Android submitted.',
  });
});

module.exports = router;
