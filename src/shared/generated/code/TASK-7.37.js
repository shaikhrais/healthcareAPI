const express = require('express');

const router = express.Router();

router.get('/TASK-7.37', (req, res) => {
  res.json({
    taskId: 'TASK-7.37',
    title: 'Encounter linking to billing',
    description: 'Implements: Encounter linking to billing.',
  });
});

module.exports = router;
