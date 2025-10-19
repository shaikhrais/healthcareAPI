const express = require('express');

const router = express.Router();

router.get('/TASK-13.17', (req, res) => {
  res.json({
    taskId: 'TASK-13.17',
    title: 'Patient search for providers',
    description: 'Implements: Patient search for providers.',
  });
});

module.exports = router;
