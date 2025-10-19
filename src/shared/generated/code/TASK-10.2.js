const express = require('express');

const router = express.Router();

router.get('/TASK-10.2', (req, res) => {
  res.json({
    taskId: 'TASK-10.2',
    title: 'Claim Status Tracking',
    description: '276/277; timeline.',
  });
});

module.exports = router;
