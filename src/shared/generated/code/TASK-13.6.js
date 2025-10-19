const express = require('express');

const router = express.Router();

router.get('/TASK-13.6', (req, res) => {
  res.json({
    taskId: 'TASK-13.6',
    title: 'Patient payments on mobile',
    description: 'Implements: Patient payments on mobile.',
  });
});

module.exports = router;
