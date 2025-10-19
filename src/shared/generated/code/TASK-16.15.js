const express = require('express');

const router = express.Router();

router.get('/TASK-16.15', (req, res) => {
  res.json({
    taskId: 'TASK-16.15',
    title: 'API playground',
    description: 'Implements: API playground.',
  });
});

module.exports = router;
