const express = require('express');

const router = express.Router();

router.get('/TASK-3.4', (req, res) => {
  res.json({
    taskId: 'TASK-3.4',
    title: 'Patient Search & Filters',
    description: 'Fast search, autocomplete.',
  });
});

module.exports = router;
