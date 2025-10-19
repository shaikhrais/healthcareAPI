const express = require('express');

const router = express.Router();

router.get('/TASK-3.2', (req, res) => {
  res.json({
    taskId: 'TASK-3.2',
    title: 'Medical History Tracking',
    description: 'Conditions, allergies, meds.',
  });
});

module.exports = router;
