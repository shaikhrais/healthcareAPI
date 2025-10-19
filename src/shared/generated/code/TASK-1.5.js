const express = require('express');

const router = express.Router();

router.get('/TASK-1.5', (req, res) => {
  res.json({
    taskId: 'TASK-1.5',
    title: 'CI/CD Pipeline',
    description: 'Automated build/test/deploy.',
  });
});

module.exports = router;
