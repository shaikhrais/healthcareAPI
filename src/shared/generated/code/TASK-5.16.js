const express = require('express');

const router = express.Router();

router.get('/TASK-5.16', (req, res) => {
  res.json({
    taskId: 'TASK-5.16',
    title: 'Patient preferences',
    description: 'Implements: Patient preferences.',
  });
});

module.exports = router;
