const express = require('express');

const router = express.Router();

router.get('/TASK-5.8', (req, res) => {
  res.json({
    taskId: 'TASK-5.8',
    title: 'Group bookings',
    description: 'Implements: Group bookings.',
  });
});

module.exports = router;
