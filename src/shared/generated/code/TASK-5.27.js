const express = require('express');

const router = express.Router();

router.get('/TASK-5.27', (req, res) => {
  res.json({
    taskId: 'TASK-5.27',
    title: 'Overbooking rules',
    description: 'Implements: Overbooking rules.',
  });
});

module.exports = router;
