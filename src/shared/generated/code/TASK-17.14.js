const express = require('express');

const router = express.Router();

router.get('/TASK-17.14', (req, res) => {
  res.json({
    taskId: 'TASK-17.14',
    title: 'Test Data Management',
    description: 'Reusable anonymized datasets.',
  });
});

module.exports = router;
