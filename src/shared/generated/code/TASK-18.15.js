const express = require('express');

const router = express.Router();

router.get('/TASK-18.15', (req, res) => {
  res.json({
    taskId: 'TASK-18.15',
    title: 'Go-Live Dry Run',
    description: 'Full end-to-end rehearsal.',
  });
});

module.exports = router;
