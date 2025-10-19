const express = require('express');

const router = express.Router();

router.get('/TASK-2.1', (req, res) => {
  res.json({
    taskId: 'TASK-2.1',
    title: 'Role-Based Access Control',
    description: 'Roles & granular permissions.',
  });
});

module.exports = router;
