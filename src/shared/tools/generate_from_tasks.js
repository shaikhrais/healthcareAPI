const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'healthcare';

async function main(limit = Infinity) {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection('Tasks');
  const cursor = col.find({}).sort({ _id: 1 }).limit(limit);

  const outDir = path.resolve(__dirname, '..', 'generated-data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  let count = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const id = doc.taskId || doc._id;
    const filename = path.join(outDir, `${id}.json`);
    fs.writeFileSync(filename, JSON.stringify(doc, null, 2));
    console.log('Wrote', filename);
    count += 1;
  }

  console.log(`Exported ${count} tasks to ${outDir}`);
  await client.close();
}

if (require.main === module) {
  const lim = parseInt(process.argv[2], 10) || Infinity;
  main(lim).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
