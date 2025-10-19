const express = require('express');

const router = express.Router();

router.get('/TASK-10.12', (req, res) => {
  res.json({
    taskId: 'TASK-10.12',
    title: 'Clearinghouse management (multi)',
    description: 'Implements: Clearinghouse management (multi).',
  });
});

module.exports = router;
