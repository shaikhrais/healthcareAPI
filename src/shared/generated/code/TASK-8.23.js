const express = require('express');

const router = express.Router();

router.get('/TASK-8.23', (req, res) => {
  res.json({
    taskId: 'TASK-8.23',
    title: 'Encounter billing linkage',
    description: 'Implements: Encounter billing linkage.',
  });
});

module.exports = router;
