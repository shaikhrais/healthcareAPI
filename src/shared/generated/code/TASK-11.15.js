const express = require('express');

const router = express.Router();

router.get('/TASK-11.15', (req, res) => {
  res.json({
    taskId: 'TASK-11.15',
    title: 'Location performance comparison',
    description: 'Implements: Location performance comparison.',
  });
});

module.exports = router;
