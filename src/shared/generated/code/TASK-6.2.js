const express = require('express');

const router = express.Router();

router.get('/TASK-6.2', (req, res) => {
  res.json({
    taskId: 'TASK-6.2',
    title: 'Resource Booking',
    description: 'Rooms/equipment booking.',
  });
});

module.exports = router;
