const express = require('express');

const router = express.Router();

router.get('/TASK-12.21', (req, res) => {
  res.json({
    taskId: 'TASK-12.21',
    title: 'Mobile analytics app',
    description: 'Implements: Mobile analytics app.',
  });
});

module.exports = router;
