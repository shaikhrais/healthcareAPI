const express = require('express');

const router = express.Router();

router.get('/TASK-14.16', (req, res) => {
  res.json({
    taskId: 'TASK-14.16',
    title: 'Share app with friends',
    description: 'Implements: Share app with friends.',
  });
});

module.exports = router;
