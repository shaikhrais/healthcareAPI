const express = require('express');

const router = express.Router();

router.get('/TASK-7.1', (req, res) => {
  res.json({
    taskId: 'TASK-7.1',
    title: 'SOAP Notes Interface',
    description: 'Four sections, autosave, templates.',
  });
});

module.exports = router;
