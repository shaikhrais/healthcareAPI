const express = require('express');

const router = express.Router();

router.get('/TASK-10.7', (req, res) => {
  res.json({
    taskId: 'TASK-10.7',
    title: 'Charge capture mobile app',
    description: 'Implements: Charge capture mobile app.',
  });
});

module.exports = router;
