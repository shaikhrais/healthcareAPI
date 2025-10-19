const express = require('express');

const router = express.Router();

router.get('/TASK-14.18', (req, res) => {
  res.json({
    taskId: 'TASK-14.18',
    title: 'Language/locale support',
    description: 'Implements: Language/locale support.',
  });
});

module.exports = router;
