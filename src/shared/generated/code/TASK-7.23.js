const express = require('express');

const router = express.Router();

router.get('/TASK-7.23', (req, res) => {
  res.json({
    taskId: 'TASK-7.23',
    title: 'Allergy documentation',
    description: 'Implements: Allergy documentation.',
  });
});

module.exports = router;
