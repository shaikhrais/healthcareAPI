const express = require('express');

const router = express.Router();

router.get('/TASK-8.4', (req, res) => {
  res.json({
    taskId: 'TASK-8.4',
    title: 'Voice Dictation Integration',
    description: 'Speech-to-text with med vocab.',
  });
});

module.exports = router;
