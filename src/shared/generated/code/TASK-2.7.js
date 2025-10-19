const express = require('express');

const router = express.Router();

router.get('/TASK-2.7', (req, res) => {
  res.json({
    taskId: 'TASK-2.7',
    title: 'Admin Dashboard Skeleton',
    description: 'Add capability: Admin Dashboard Skeleton.',
  });
});

module.exports = router;
