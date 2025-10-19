const express = require('express');

const router = express.Router();

router.get('/TASK-13.2', (req, res) => {
  res.json({
    taskId: 'TASK-13.2',
    title: 'Patient Portal - Booking',
    description: 'View/book/reschedule.',
  });
});

module.exports = router;
