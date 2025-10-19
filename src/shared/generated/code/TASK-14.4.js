const express = require('express');

const router = express.Router();

router.get('/TASK-14.4', (req, res) => {
  res.json({
    taskId: 'TASK-14.4',
    title: 'Document Camera & OCR',
    description: 'Capture + OCR + upload.',
  });
});

module.exports = router;
