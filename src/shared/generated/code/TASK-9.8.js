const express = require('express');

const router = express.Router();

router.get('/TASK-9.8', (req, res) => {
  res.json({
    taskId: 'TASK-9.8',
    title: 'Payment receipt printing',
    description: 'Implements: Payment receipt printing.',
  });
});

module.exports = router;
