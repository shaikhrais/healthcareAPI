const express = require('express');

const router = express.Router();

router.get('/TASK-4.3', (req, res) => {
  res.json({
    taskId: 'TASK-4.3',
    title: 'Patient Tags & Groups',
    description: 'Custom tags/groups + bulk ops.',
  });
});

module.exports = router;
