const express = require('express');

const router = express.Router();

router.get('/TASK-2.8', (req, res) => {
  res.json({
    taskId: 'TASK-2.8',
    title: 'Health Check & Readiness Probes',
    description: 'Add capability: Health Check & Readiness Probes.',
  });
});

module.exports = router;
