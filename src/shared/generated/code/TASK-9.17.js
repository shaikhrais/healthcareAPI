const express = require('express');

const router = express.Router();

router.get('/TASK-9.17', (req, res) => {
  res.json({
    taskId: 'TASK-9.17',
    title: 'Payment allocation rules',
    description: 'Implements: Payment allocation rules.',
  });
});

module.exports = router;
