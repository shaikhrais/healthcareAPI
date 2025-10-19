const express = require('express');

const router = express.Router();

router.get('/TASK-7.30', (req, res) => {
  res.json({
    taskId: 'TASK-7.30',
    title: 'Body diagrams',
    description: 'Implements: Body diagrams.',
  });
});

module.exports = router;
