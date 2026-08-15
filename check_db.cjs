const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('apms_db'); // guessing DB name
  const collection = db.collection('company_profiles');
  const profiles = await collection.find({}).limit(5).toArray();
  
  console.log(JSON.stringify(profiles.map(p => ({
    companyId: p.companyId,
    legalName: p.identity?.legalName,
    identity: p.identity,
    contact: p.contact
  })), null, 2));
  
  await client.close();
}

check().catch(console.error);
