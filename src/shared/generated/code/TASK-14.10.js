const express = require('express');

const router = express.Router();

router.get('/TASK-14.10', (req, res) => {
  res.json({
    taskId: 'TASK-14.10',
    title: 'App store optimization',
    description: 'Implements: App store optimization.',
  });
});

module.exports = router;
