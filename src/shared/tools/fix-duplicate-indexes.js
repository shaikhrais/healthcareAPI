#!/usr/bin/env node

/**
 * Mongoose Index Deduplication Tool
 * 
 * Reads the AST duplicate index report and safely comments out duplicate indexes
 * to prevent "Index already exists" errors in production MongoDB
 */

const fs = require('fs').promises;
const path = require('path');

async function fixDuplicateIndexes() {
  console.log('🔧 Starting Mongoose index deduplication...\n');

  try {
    // Read the AST duplicate index report
    const reportPath = path.join(__dirname, '..', 'reports', 'duplicate-index-report-ast.json');
    const reportData = JSON.parse(await fs.readFile(reportPath, 'utf8'));

    console.log(`📊 Found ${reportData.groups.length} duplicate index groups`);
    console.log(`📅 Report generated: ${new Date(reportData.generatedAt).toLocaleString()}\n`);

    let totalDuplicatesFixed = 0;
    let filesModified = new Set();

    // Process each group of duplicates
    for (let i = 0; i < reportData.groups.length; i++) {
      const group = reportData.groups[i];
      
      console.log(`🔍 Group ${i + 1}: Index on fields ${JSON.stringify(group.fields)}`);
      console.log(`   📍 ${group.occurrences.length} occurrences found`);

      // Keep the first occurrence, comment out the rest
      for (let j = 1; j < group.occurrences.length; j++) {
        const occurrence = group.occurrences[j];
        const success = await commentOutIndex(occurrence);
        
        if (success) {
          totalDuplicatesFixed++;
          filesModified.add(occurrence.file);
          console.log(`   ✅ Commented out duplicate in: ${path.basename(occurrence.file)}`);
        } else {
          console.log(`   ❌ Failed to fix duplicate in: ${path.basename(occurrence.file)}`);
        }
      }
      console.log('');
    }

    console.log('📈 Summary:');
    console.log(`   🔧 Total duplicates fixed: ${totalDuplicatesFixed}`);
    console.log(`   📁 Files modified: ${filesModified.size}`);
    console.log(`   📋 Modified files:`);
    
    for (const filePath of filesModified) {
      console.log(`      - ${path.basename(filePath)}`);
    }

    console.log('\n✅ Index deduplication completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Review the commented indexes manually');
    console.log('   2. Test the application with production MongoDB');
    console.log('   3. Run database index optimization if needed');

  } catch (error) {
    console.error('❌ Error during index deduplication:', error.message);
    process.exit(1);
  }
}

/**
 * Comment out a specific duplicate index in a model file
 */
async function commentOutIndex(occurrence) {
  try {
    const filePath = occurrence.file;
    let content = await fs.readFile(filePath, 'utf8');
    
    // Create the index pattern to match
    const fieldsStr = JSON.stringify(occurrence.fields);
    
    // Look for schema.index() calls with these exact fields
    const fieldsPattern = createFieldsPattern(occurrence.fields);
    const indexPatterns = [
      new RegExp(`^(\\s*)(\\w+Schema\\.index\\(\\s*${fieldsPattern}[^)]*\\);?)`, 'gm'),
      new RegExp(`^(\\s*)(schema\\.index\\(\\s*${fieldsPattern}[^)]*\\);?)`, 'gm'),
      new RegExp(`^(\\s*)(this\\.index\\(\\s*${fieldsPattern}[^)]*\\);?)`, 'gm'),
    ];

    let modified = false;
    for (const pattern of indexPatterns) {
      const newContent = content.replace(pattern, (match, indent, indexCall) => {
        // Check if it's already commented
        if (match.trim().startsWith('//')) {
          return match; // Already commented
        }
        
        modified = true;
        return `${indent}// DUPLICATE INDEX - Auto-commented by deduplication tool\n${indent}// ${indexCall}`;
      });
      
      if (newContent !== content) {
        content = newContent;
        break;
      }
    }

    if (modified) {
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    }

    // If regex didn't work, try a more generic approach
    return await commentOutByLineSearch(filePath, occurrence.fields);
    
  } catch (error) {
    console.error(`Error processing ${occurrence.file}:`, error.message);
    return false;
  }
}

/**
 * Fallback method: Search for index lines and comment them out
 */
async function commentOutByLineSearch(filePath, fields) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    
    // Create search patterns for the specific fields
    const searchPatterns = [];
    for (const [key, value] of Object.entries(fields)) {
      if (value === null) {
        searchPatterns.push(`${key}:`);
      } else {
        searchPatterns.push(`${key}: ${value}`);
      }
    }
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for lines containing schema.index with our field patterns
      if (line.includes('.index(') && !line.trim().startsWith('//')) {
        // Check if all field patterns are present in this line
        const allPatternsFound = searchPatterns.every(pattern => line.includes(pattern));
        
        if (allPatternsFound) {
          const indent = line.match(/^\s*/)[0];
          lines[i] = `${indent}// DUPLICATE INDEX - Auto-commented by deduplication tool\n${indent}// ${line.trim()}`;
          modified = true;
          break;
        }
      }
    }
    
    if (modified) {
      await fs.writeFile(filePath, lines.join('\n'), 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Create a regex pattern to match the fields in index definitions
 */
function createFieldsPattern(fields) {
  // Convert the fields object to a regex pattern
  const pairs = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null) {
      pairs.push(`['"]?${escapeRegex(key)}['"]?\\s*:\\s*-?1`);
    } else {
      pairs.push(`['"]?${escapeRegex(key)}['"]?\\s*:\\s*${escapeRegex(String(value))}`);
    }
  }
  
  return `\\{\\s*(${pairs.join('\\s*,\\s*|')})\\s*\\}`;
}

/**
 * Escape special characters for regex
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Run the deduplication if this script is executed directly
if (require.main === module) {
  fixDuplicateIndexes().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { fixDuplicateIndexes };