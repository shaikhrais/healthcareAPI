const express = require('express');

const router = express.Router();

router.get('/TASK-14.23', (req, res) => {
  res.json({
    taskId: 'TASK-14.23',
    title: 'App size optimization',
    description: 'Implements: App size optimization.',
  });
});

module.exports = router;
