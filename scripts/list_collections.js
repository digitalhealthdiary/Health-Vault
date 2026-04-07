import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function run() {
    const dbId = process.env.VITE_APPWRITE_DATABASE_ID;
    const res = await databases.listCollections(dbId);
    console.log('Collections in DB:');
    res.collections.forEach(c => console.log(` - ${c.name}: ${c.$id}`));
}

run().catch(console.error);
