const express = require('express');

const router = express.Router();

router.get('/TASK-6.15', (req, res) => {
  res.json({
    taskId: 'TASK-6.15',
    title: 'Patient routing',
    description: 'Implements: Patient routing.',
  });
});

module.exports = router;
