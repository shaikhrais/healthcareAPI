const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const repoRoot = path.resolve(__dirname, '..', '..');
const modelsDir = path.join(repoRoot, 'backend', 'models');
const outDir = path.join(repoRoot, 'backend', 'reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function normalizeIndexSpec(spec){
  if(typeof spec !== 'object' || spec === null) return String(spec);
  const keys = Object.keys(spec).sort();
  const normalized = {};
  keys.forEach(k => normalized[k] = spec[k]);
  return JSON.stringify(normalized);
}

function extractFromAST(ast, filePath){
  const found = [];
  const { types: t } = require('@babel/types');

  // minimal recursive walk to find nodes of interest
  function walk(node, parent){
    if(!node || typeof node !== 'object') return;
    // detect schema.index(...) patterns: MemberExpression -> CallExpression where property.name === 'index'
    if(node.type === 'CallExpression' && node.callee){
      const callee = node.callee;
      if(callee.type === 'MemberExpression' && ((callee.property && callee.property.name === 'index') || (callee.property && callee.property.value === 'index'))){
        const args = node.arguments || [];
        if(args[0]){
          try{
            // try evaluate simple ObjectExpression to JS object
            if(args[0].type === 'ObjectExpression'){
              const fields = objectExpressionToObject(args[0]);
              let opts = {};
              if(args[1] && args[1].type === 'ObjectExpression') opts = objectExpressionToObject(args[1]);
              found.push({ type: 'schema.index', file: filePath, fields, options: opts });
            }
          }catch(e){ }
        }
      }
    }

    // detect new Schema({...}, {...}) and look for per-field index/unique
    if(node.type === 'NewExpression' && node.callee && node.callee.name === 'Schema'){
      const args = node.arguments || [];
      if(args[0] && args[0].type === 'ObjectExpression'){
        const def = args[0];
        def.properties.forEach(prop => {
          if(prop.type === 'ObjectProperty'){
            const key = prop.key.name || (prop.key.value && String(prop.key.value));
            const val = prop.value;
            if(val.type === 'ObjectExpression'){
              let hasIndex = false;
              let unique = false;
              val.properties.forEach(p => {
                const pn = p.key && (p.key.name || p.key.value);
                if(pn === 'index' && p.value.type === 'BooleanLiteral' && p.value.value === true) hasIndex = true;
                if(pn === 'unique' && p.value.type === 'BooleanLiteral' && p.value.value === true) unique = true;
              });
              if(hasIndex || unique){
                const fields = {}; fields[key] = 1;
                found.push({ type: 'field.index', file: filePath, fields, options: { unique } });
              }
            }
          }
        });
      }
      // also second arg could contain indexes option array but skipping for brevity
    }

    // recurse
    for(const k of Object.keys(node)){
      const child = node[k];
      if(Array.isArray(child)){
        child.forEach(c => walk(c, node));
      }else if(child && typeof child === 'object' && child.type){
        walk(child, node);
      }
    }
  }

  function objectExpressionToObject(objExpr){
    const out = {};
    objExpr.properties.forEach(p => {
      const key = p.key.name || (p.key.value && String(p.key.value));
      if(p.value.type === 'NumericLiteral') out[key] = p.value.value;
      else if(p.value.type === 'StringLiteral') out[key] = p.value.value;
      else if(p.value.type === 'BooleanLiteral') out[key] = p.value.value;
      else if(p.value.type === 'ObjectExpression') out[key] = objectExpressionToObject(p.value);
      else out[key] = null;
    });
    return out;
  }

  walk(ast, null);
  return found;
}

function scanModels(){
  const files = fs.existsSync(modelsDir) ? fs.readdirSync(modelsDir).filter(f => f.endsWith('.js')) : [];
  const records = [];
  files.forEach(file => {
    const p = path.join(modelsDir, file);
    const content = fs.readFileSync(p, 'utf8');
    try{
      const ast = parser.parse(content, { sourceType: 'unambiguous', plugins: ['jsx', 'classProperties', 'optionalChaining'] });
      const found = extractFromAST(ast, p);
      found.forEach(f => records.push({ ...f, normalized: normalizeIndexSpec(f.fields) }));
    }catch(e){
      // parsing error: skip
    }
  });
  return records;
}

function groupDuplicates(records){
  const map = new Map();
  records.forEach(r => {
    const key = r.normalized;
    if(!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  const groups = [];
  map.forEach((arr, key) => {
    if(arr.length > 1) groups.push({ fields: JSON.parse(key), occurrences: arr });
  });
  return groups;
}

function writeReports(groups, records){
  const outJson = path.join(outDir, 'duplicate-index-report-ast.json');
  const outCsv = path.join(outDir, 'duplicate-index-report-ast.csv');
  fs.writeFileSync(outJson, JSON.stringify({ generatedAt: new Date().toISOString(), groups, totalIndexes: records.length }, null, 2));
  const header = 'fields,file,type,options\n';
  const lines = [];
  groups.forEach(g => {
    g.occurrences.forEach(o => {
      lines.push(`"${JSON.stringify(g.fields).replace(/"/g,'""')}","${o.file}","${o.type}","${JSON.stringify(o.options||{}).replace(/"/g,'""')}"`);
    });
  });
  fs.writeFileSync(outCsv, header + lines.join('\n'));
  return { outJson, outCsv };
}

function main(){
  console.log('AST scanning models dir:', modelsDir);
  const records = scanModels();
  console.log('Found index entries:', records.length);
  const groups = groupDuplicates(records);
  console.log('Duplicate groups found:', groups.length);
  const res = writeReports(groups, records);
  console.log('Wrote reports:', res);
}

if(require.main === module) main();
