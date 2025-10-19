const express = require('express');

const router = express.Router();

router.get('/TASK-7.14', (req, res) => {
  res.json({
    taskId: 'TASK-7.14',
    title: 'Imaging orders',
    description: 'Implements: Imaging orders.',
  });
});

module.exports = router;
