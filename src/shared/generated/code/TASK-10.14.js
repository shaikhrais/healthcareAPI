const express = require('express');

const router = express.Router();

router.get('/TASK-10.14', (req, res) => {
  res.json({
    taskId: 'TASK-10.14',
    title: 'Tertiary claim handling',
    description: 'Implements: Tertiary claim handling.',
  });
});

module.exports = router;
