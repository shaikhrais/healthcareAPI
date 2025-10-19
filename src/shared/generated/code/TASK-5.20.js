const express = require('express');

const router = express.Router();

router.get('/TASK-5.20', (req, res) => {
  res.json({
    taskId: 'TASK-5.20',
    title: 'Rescheduling workflows',
    description: 'Implements: Rescheduling workflows.',
  });
});

module.exports = router;
