const express = require('express');

const router = express.Router();

router.get('/TASK-13.3', (req, res) => {
  res.json({
    taskId: 'TASK-13.3',
    title: 'Patient Portal - Records',
    description: 'View notes/results/docs.',
  });
});

module.exports = router;
