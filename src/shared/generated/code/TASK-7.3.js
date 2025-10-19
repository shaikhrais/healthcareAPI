const express = require('express');

const router = express.Router();

router.get('/TASK-7.3', (req, res) => {
  res.json({
    taskId: 'TASK-7.3',
    title: 'Note Templates Library',
    description: 'Specialty templates + variables.',
  });
});

module.exports = router;
