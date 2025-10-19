const express = require('express');

const router = express.Router();

router.get('/TASK-18.16', (req, res) => {
  res.json({
    taskId: 'TASK-18.16',
    title: 'Rollback Simulation',
    description: 'Practice rollback and recovery.',
  });
});

module.exports = router;
