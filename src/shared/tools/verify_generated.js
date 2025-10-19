const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..'); // expo-jane root
const dataPath = path.join(__dirname, '..', 'generated_all.json');
if (!fs.existsSync(dataPath)) {
  console.error('generated_all.json not found at', dataPath);
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const summary = {
  total: data.length,
  missingBackend: [],
  missingTest: [],
  missingFrontend_generated_from_desc: [],
  missingFrontend_generated: [],
};

for (const t of data) {
  const id = t.taskId || t.id || t._id || t.name || t.TaskId || t.task_id || t.task || 'unknown';
  const raw = id.toString();
  const safe = raw.replace(/[^a-zA-Z0-9_.-]/g, '_');

  // possible filename variants to handle inputs that already include TASK- prefix
  const candidates = [];
  // variant: TASK-{safe}
  candidates.push(`TASK-${safe}.js`);
  // variant: if raw already starts with TASK- then use raw as-is (sanitized)
  if (/^TASK[-_]/i.test(raw)) {
    const normalized = raw.replace(/[^a-zA-Z0-9_.-]/g, '_');
    candidates.push(`${normalized}.js`);
    // also strip a leading TASK- if double prefix could happen
    const stripped = normalized.replace(/^TASK[-_]+/i, '');
    if (stripped && stripped !== normalized) candidates.push(`TASK-${stripped}.js`);
  }

  // dedupe candidates
  const uniq = Array.from(new Set(candidates));

  const backendExists = uniq.some((n) =>
    fs.existsSync(path.join(__dirname, '..', 'generated-code', n))
  );
  const testExists = uniq.some((n) =>
    fs.existsSync(
      path.join(__dirname, '..', 'tests', 'generated-code', n.replace(/\.js$/, '.test.js'))
    )
  );
  const frontendExists1 = uniq.some((n) =>
    fs.existsSync(path.join(repoRoot, 'src', 'generated_from_desc', n))
  );
  const frontendExists2 = uniq.some((n) =>
    fs.existsSync(path.join(repoRoot, 'src', 'generated', n))
  );

  if (!backendExists)
    summary.missingBackend.push(
      path.relative(repoRoot, path.join('backend', 'generated-code', uniq[0]))
    );
  if (!testExists)
    summary.missingTest.push(
      path.relative(
        repoRoot,
        path.join('backend', 'tests', 'generated-code', uniq[0].replace(/\.js$/, '.test.js'))
      )
    );
  if (!frontendExists1)
    summary.missingFrontend_generated_from_desc.push(
      path.relative(repoRoot, path.join('src', 'generated_from_desc', uniq[0]))
    );
  if (!frontendExists2)
    summary.missingFrontend_generated.push(
      path.relative(repoRoot, path.join('src', 'generated', uniq[0]))
    );
}

// Deduplicate and trim long arrays (only show up to 30 examples for readability)
for (const k of Object.keys(summary)) {
  if (Array.isArray(summary[k])) {
    summary[k] = Array.from(new Set(summary[k]));
    if (summary[k].length > 30)
      summary[k] = summary[k].slice(0, 30).concat([`...and ${summary[k].length - 30} more`]);
  }
}

console.log(JSON.stringify(summary, null, 2));
