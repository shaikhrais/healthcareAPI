const express = require('express');

const router = express.Router();

router.get('/TASK-12.16', (req, res) => {
  res.json({
    taskId: 'TASK-12.16',
    title: 'Patient journey mapping',
    description: 'Implements: Patient journey mapping.',
  });
});

module.exports = router;
