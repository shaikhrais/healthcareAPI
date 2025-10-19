const express = require('express');

const router = express.Router();

router.get('/TASK-5.12', (req, res) => {
  res.json({
    taskId: 'TASK-5.12',
    title: 'Double-booking prevention',
    description: 'Implements: Double-booking prevention.',
  });
});

module.exports = router;
