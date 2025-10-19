const express = require('express');

const router = express.Router();

router.get('/TASK-9.16', (req, res) => {
  res.json({
    taskId: 'TASK-9.16',
    title: 'Overpayment handling',
    description: 'Implements: Overpayment handling.',
  });
});

module.exports = router;
