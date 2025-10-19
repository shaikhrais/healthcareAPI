const express = require('express');

const router = express.Router();

router.get('/TASK-16.5', (req, res) => {
  res.json({
    taskId: 'TASK-16.5',
    title: 'Integration Marketplace',
    description: 'Browse/install integrations.',
  });
});

module.exports = router;
