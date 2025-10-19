const express = require('express');

const router = express.Router();

router.get('/TASK-18.3', (req, res) => {
  res.json({ taskId: 'TASK-18.3', title: 'Backup & DR', description: 'Backups & DR drill.' });
});

module.exports = router;
