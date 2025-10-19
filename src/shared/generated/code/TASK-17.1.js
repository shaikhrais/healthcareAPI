const express = require('express');

const router = express.Router();

router.get('/TASK-17.1', (req, res) => {
  res.json({
    taskId: 'TASK-17.1',
    title: 'Unit Testing - Wave 1',
    description: 'Core services tests.',
  });
});

module.exports = router;
