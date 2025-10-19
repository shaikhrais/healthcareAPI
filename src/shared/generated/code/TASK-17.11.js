const express = require('express');

const router = express.Router();

router.get('/TASK-17.11', (req, res) => {
  res.json({
    taskId: 'TASK-17.11',
    title: 'Mobile Device Lab Tests',
    description: 'Physical iOS/Android device passes.',
  });
});

module.exports = router;
