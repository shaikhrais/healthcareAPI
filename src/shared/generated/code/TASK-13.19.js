const express = require('express');

const router = express.Router();

router.get('/TASK-13.19', (req, res) => {
  res.json({
    taskId: 'TASK-13.19',
    title: 'Visit summary viewer',
    description: 'Implements: Visit summary viewer.',
  });
});

module.exports = router;
