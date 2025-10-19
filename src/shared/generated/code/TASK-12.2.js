const express = require('express');

const router = express.Router();

router.get('/TASK-12.2', (req, res) => {
  res.json({
    taskId: 'TASK-12.2',
    title: 'Data Export',
    description: 'Excel/CSV/PDF; large sets.',
  });
});

module.exports = router;
