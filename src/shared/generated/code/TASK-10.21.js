const express = require('express');

const router = express.Router();

router.get('/TASK-10.21', (req, res) => {
  res.json({
    taskId: 'TASK-10.21',
    title: 'Payment plan calculator',
    description: 'Implements: Payment plan calculator.',
  });
});

module.exports = router;
