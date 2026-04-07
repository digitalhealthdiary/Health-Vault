import { Client, Databases, Storage } from 'node-appwrite';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function extractIds() {
    try {
        const dbs = await databases.list();
        const db = dbs.databases.find(d => d.name === 'HealthVault');
        if (!db) {
            console.log("No HealthVault database found!");
            return;
        }
        
        const cols = await databases.listCollections(db.$id);
        const vitals = cols.collections.find(c => c.name === 'Vitals');
        const docs = cols.collections.find(c => c.name === 'Documents');
        
        const buckets = await storage.listBuckets();
        const bucket = buckets.buckets.find(b => b.name === 'MedicalRecords');

        let envContent = fs.readFileSync('.env.local', 'utf8');
        
        if (!envContent.includes('VITE_APPWRITE_DATABASE_ID')) {
            envContent += `\nVITE_APPWRITE_DATABASE_ID=${db.$id}\n`;
            envContent += `VITE_APPWRITE_VITALS_COLLECTION_ID=${vitals ? vitals.$id : ''}\n`;
            envContent += `VITE_APPWRITE_DOCS_COLLECTION_ID=${docs ? docs.$id : ''}\n`;
            envContent += `VITE_APPWRITE_RECORDS_BUCKET_ID=${bucket ? bucket.$id : ''}\n`;
            fs.writeFileSync('.env.local', envContent);
            console.log("SUCCESSFULLY APPENDED IDs TO .env.local");
        } else {
            console.log("IDs already exist in .env.local");
        }
    } catch (e) {
        console.error(e);
    }
}
extractIds();
