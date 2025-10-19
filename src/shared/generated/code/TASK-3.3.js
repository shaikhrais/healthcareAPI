const express = require('express');

const router = express.Router();

router.get('/TASK-3.3', (req, res) => {
  res.json({
    taskId: 'TASK-3.3',
    title: 'Insurance Info Management',
    description: 'Policy data, card photos.',
  });
});

module.exports = router;
