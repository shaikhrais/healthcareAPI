const express = require('express');

const router = express.Router();

router.get('/TASK-7.10', (req, res) => {
  res.json({
    taskId: 'TASK-7.10',
    title: 'Drug interaction checking',
    description: 'Implements: Drug interaction checking.',
  });
});

module.exports = router;
