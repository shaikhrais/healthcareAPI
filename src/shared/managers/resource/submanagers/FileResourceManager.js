const fs = require('fs');
const path = require('path');
class FileResourceManager {
  static inventoryDir = path.join(__dirname, '../../../../public/docs');
  static inventory() {
    // List all files in docs directory
    if (!fs.existsSync(this.inventoryDir)) return [];
    return fs.readdirSync(this.inventoryDir).map(name => ({
      type: 'file',
      name,
      path: path.join(this.inventoryDir, name)
    }));
  }
}
module.exports = FileResourceManager;
