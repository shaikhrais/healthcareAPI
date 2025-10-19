const express = require('express');

const router = express.Router();

router.get('/TASK-5.26', (req, res) => {
  res.json({
    taskId: 'TASK-5.26',
    title: 'Capacity planning',
    description: 'Implements: Capacity planning.',
  });
});

module.exports = router;
