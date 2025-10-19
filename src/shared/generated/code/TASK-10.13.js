const express = require('express');

const router = express.Router();

router.get('/TASK-10.13', (req, res) => {
  res.json({
    taskId: 'TASK-10.13',
    title: 'Secondary claim generation',
    description: 'Implements: Secondary claim generation.',
  });
});

module.exports = router;
