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
    // Delete the duplicate (second one)
    await databases.deleteCollection(dbId, '69c7a6020009fe4966a6');
    console.log('Deleted duplicate ShareLinks collection.');
}

run().catch(console.error);
