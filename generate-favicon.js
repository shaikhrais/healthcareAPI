/**
 * Favicon Generator for HealthCare API
 * Creates a proper favicon.ico file from SVG data
 */

const fs = require('fs');
const path = require('path');

// Simple ICO file header structure
function createIcoHeader(imageCount) {
  const buffer = Buffer.alloc(6);
  buffer.writeUInt16LE(0, 0);      // Reserved (must be 0)
  buffer.writeUInt16LE(1, 2);      // Image type (1 = ICO)
  buffer.writeUInt16LE(imageCount, 4); // Number of images
  return buffer;
}

// ICO directory entry (16 bytes per image)
function createIcoDirectoryEntry(width, height, colorCount, reserved, planes, bitCount, bytesInRes, imageOffset) {
  const buffer = Buffer.alloc(16);
  buffer.writeUInt8(width === 256 ? 0 : width, 0);
  buffer.writeUInt8(height === 256 ? 0 : height, 1);
  buffer.writeUInt8(colorCount, 2);
  buffer.writeUInt8(reserved, 3);
  buffer.writeUInt16LE(planes, 4);
  buffer.writeUInt16LE(bitCount, 6);
  buffer.writeUInt32LE(bytesInRes, 8);
  buffer.writeUInt32LE(imageOffset, 12);
  return buffer;
}

// Create a simple BMP for ICO (32x32, 32-bit with alpha)
function createBmpData() {
  const width = 32;
  const height = 32;
  const bitsPerPixel = 32;
  const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const bmpInfoHeaderSize = 40;
  
  // BMP Info Header
  const bmpInfoHeader = Buffer.alloc(bmpInfoHeaderSize);
  bmpInfoHeader.writeUInt32LE(bmpInfoHeaderSize, 0);  // Header size
  bmpInfoHeader.writeInt32LE(width, 4);               // Width
  bmpInfoHeader.writeInt32LE(height * 2, 8);          // Height (doubled for ICO)
  bmpInfoHeader.writeUInt16LE(1, 12);                 // Planes
  bmpInfoHeader.writeUInt16LE(bitsPerPixel, 14);      // Bits per pixel
  bmpInfoHeader.writeUInt32LE(0, 16);                 // Compression
  bmpInfoHeader.writeUInt32LE(pixelArraySize, 20);    // Image size
  bmpInfoHeader.writeInt32LE(0, 24);                  // X pixels per meter
  bmpInfoHeader.writeInt32LE(0, 28);                  // Y pixels per meter
  bmpInfoHeader.writeUInt32LE(0, 32);                 // Colors used
  bmpInfoHeader.writeUInt32LE(0, 36);                 // Important colors
  
  // Create pixel data for a medical cross icon
  const pixelData = Buffer.alloc(pixelArraySize);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = ((height - 1 - y) * rowSize) + (x * 4);
      
      // Calculate if we're in the circle
      const centerX = width / 2;
      const centerY = height / 2;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      if (distance <= 15) {
        // We're inside the circle - blue background with medical cross
        let isWhiteCross = false;
        
        // Vertical bar of cross (6 pixels wide, centered)
        if (x >= 13 && x <= 18 && y >= 7 && y <= 24) {
          isWhiteCross = true;
        }
        // Horizontal bar of cross (6 pixels wide, centered)
        if (y >= 13 && y <= 18 && x >= 7 && x <= 24) {
          isWhiteCross = true;
        }
        
        if (isWhiteCross) {
          // White cross
          pixelData[pixelIndex] = 255;     // Blue
          pixelData[pixelIndex + 1] = 255; // Green
          pixelData[pixelIndex + 2] = 255; // Red
          pixelData[pixelIndex + 3] = 255; // Alpha
        } else {
          // Blue background
          pixelData[pixelIndex] = 226;     // Blue
          pixelData[pixelIndex + 1] = 144; // Green
          pixelData[pixelIndex + 2] = 74;  // Red
          pixelData[pixelIndex + 3] = 255; // Alpha
        }
      } else {
        // Transparent outside the circle
        pixelData[pixelIndex] = 0;       // Blue
        pixelData[pixelIndex + 1] = 0;   // Green
        pixelData[pixelIndex + 2] = 0;   // Red
        pixelData[pixelIndex + 3] = 0;   // Alpha (transparent)
      }
    }
  }
  
  // Combine BMP info header and pixel data
  return Buffer.concat([bmpInfoHeader, pixelData]);
}

// Generate the favicon
function generateFavicon() {
  try {
    console.log('🎨 Generating healthcare favicon...');
    
    const bmpData = createBmpData();
    const imageCount = 1;
    const headerSize = 6;
    const directorySize = 16 * imageCount;
    const imageOffset = headerSize + directorySize;
    
    // Create ICO header
    const header = createIcoHeader(imageCount);
    
    // Create directory entry
    const directoryEntry = createIcoDirectoryEntry(
      32,              // width
      32,              // height
      0,               // color count (0 for true color)
      0,               // reserved
      1,               // planes
      32,              // bit count
      bmpData.length,  // bytes in resource
      imageOffset      // offset to image data
    );
    
    // Combine all parts
    const icoData = Buffer.concat([header, directoryEntry, bmpData]);
    
    // Write to file
    const outputPath = path.join(__dirname, 'public', 'favicon.ico');
    fs.writeFileSync(outputPath, icoData);
    
    console.log('✅ Healthcare favicon created successfully!');
    console.log(`📁 Location: ${outputPath}`);
    console.log('🏥 Features: Medical cross icon with blue healthcare theme');
    console.log('📏 Size: 32x32 pixels with transparency support');
    
    return true;
  } catch (error) {
    console.error('❌ Error generating favicon:', error.message);
    return false;
  }
}

// Run the generator
if (require.main === module) {
  generateFavicon();
}

module.exports = { generateFavicon };