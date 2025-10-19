const express = require('express');

const router = express.Router();

router.get('/TASK-3.5', (req, res) => {
  res.json({
    taskId: 'TASK-3.5',
    title: 'Patient Document Upload',
    description: 'Upload/categorize docs.',
  });
});

module.exports = router;
