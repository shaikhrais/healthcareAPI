const express = require('express');

const router = express.Router();

router.get('/TASK-9.21', (req, res) => {
  res.json({
    taskId: 'TASK-9.21',
    title: 'Invoice templates customization',
    description: 'Implements: Invoice templates customization.',
  });
});

module.exports = router;
