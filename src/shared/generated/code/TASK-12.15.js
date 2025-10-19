const express = require('express');

const router = express.Router();

router.get('/TASK-12.15', (req, res) => {
  res.json({
    taskId: 'TASK-12.15',
    title: 'Booking conversion funnel',
    description: 'Implements: Booking conversion funnel.',
  });
});

module.exports = router;
