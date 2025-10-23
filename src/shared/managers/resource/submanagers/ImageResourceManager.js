const fs = require('fs');
const path = require('path');
class ImageResourceManager {
  static inventoryDir = path.join(__dirname, '../../../../public/images');
  static inventory() {
    // List all images in images directory
    if (!fs.existsSync(this.inventoryDir)) return [];
    return fs.readdirSync(this.inventoryDir).map(name => ({
      type: 'image',
      name,
      path: path.join(this.inventoryDir, name)
    }));
  }
}
module.exports = ImageResourceManager;
