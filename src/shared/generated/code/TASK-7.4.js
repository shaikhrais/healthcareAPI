const express = require('express');

const router = express.Router();

router.get('/TASK-7.4', (req, res) => {
  res.json({
    taskId: 'TASK-7.4',
    title: 'Assessment Tools & Scales',
    description: 'Pain scales, ROM, scoring.',
  });
});

module.exports = router;
