const express = require('express');

const router = express.Router();

router.get('/TASK-17.2', (req, res) => {
  res.json({
    taskId: 'TASK-17.2',
    title: 'Unit Testing - Wave 2',
    description: 'Components & APIs.',
  });
});

module.exports = router;
