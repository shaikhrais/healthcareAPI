const express = require('express');

const router = express.Router();

router.get('/TASK-7.9', (req, res) => {
  res.json({
    taskId: 'TASK-7.9',
    title: 'Prescription writing',
    description: 'Implements: Prescription writing.',
  });
});

module.exports = router;
