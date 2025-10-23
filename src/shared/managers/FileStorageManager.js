/**
 * FileStorageManager
 * Abstraction for S3, Azure Blob, or local file storage.
 */
const path = require('path');
const fs = require('fs');
const storageDir = path.join(__dirname, '../../../storage');

const FileStorageManager = {
  saveFile(filename, buffer) {
    const filePath = path.join(storageDir, filename);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  },
  readFile(filename) {
    const filePath = path.join(storageDir, filename);
    return fs.readFileSync(filePath);
  },
  deleteFile(filename) {
    const filePath = path.join(storageDir, filename);
    fs.unlinkSync(filePath);
  },
};

module.exports = FileStorageManager;