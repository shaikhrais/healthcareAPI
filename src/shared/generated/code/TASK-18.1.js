const express = require('express');

const router = express.Router();

router.get('/TASK-18.1', (req, res) => {
  res.json({
    taskId: 'TASK-18.1',
    title: 'Infrastructure Setup - Prod',
    description: 'Provision prod infra.',
  });
});

module.exports = router;
