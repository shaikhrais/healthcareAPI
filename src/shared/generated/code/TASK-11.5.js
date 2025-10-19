const express = require('express');

const router = express.Router();

router.get('/TASK-11.5', (req, res) => {
  res.json({
    taskId: 'TASK-11.5',
    title: 'Custom Report Builder',
    description: 'Drag-and-drop report builder.',
  });
});

module.exports = router;
