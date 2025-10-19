const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router();
const GEN_DIR = path.resolve(__dirname, '..', 'generated-code');

if (fs.existsSync(GEN_DIR)) {
  const files = fs.readdirSync(GEN_DIR).filter((f) => f.endsWith('.js'));
  files.forEach((f) => {
    try {
      const mod = require(path.join(GEN_DIR, f));
      // mount the exported router
      router.use('/', mod);
    } catch (err) {
      console.warn('Failed to load generated file', f, err.message);
    }
  });
}

module.exports = router;
