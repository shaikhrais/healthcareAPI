const express = require('express');

const router = express.Router();

router.get('/TASK-7.21', (req, res) => {
  res.json({
    taskId: 'TASK-7.21',
    title: 'Patient education materials',
    description: 'Implements: Patient education materials.',
  });
});

module.exports = router;
