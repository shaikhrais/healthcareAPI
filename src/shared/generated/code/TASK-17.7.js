const express = require('express');

const router = express.Router();

router.get('/TASK-17.7', (req, res) => {
  res.json({
    taskId: 'TASK-17.7',
    title: 'Cross-Browser Testing',
    description: 'Desktop/mobile matrix.',
  });
});

module.exports = router;
