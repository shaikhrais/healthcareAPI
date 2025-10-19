const express = require('express');

const router = express.Router();

router.get('/TASK-18.13', (req, res) => {
  res.json({
    taskId: 'TASK-18.13',
    title: 'Support Readiness',
    description: 'Help desk tooling & SLAs ready.',
  });
});

module.exports = router;
