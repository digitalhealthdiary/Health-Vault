import { Client, Databases, Storage, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const dbId = process.env.VITE_APPWRITE_DATABASE_ID;
const vitalsId = process.env.VITE_APPWRITE_VITALS_COLLECTION_ID;
const docsId = process.env.VITE_APPWRITE_DOCS_COLLECTION_ID;
const bucketId = process.env.VITE_APPWRITE_RECORDS_BUCKET_ID;

const perms = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users())
];

async function fix() {
    console.log('Applying broad Role.users() access rights to existing collections..');
    try {
        if(dbId && vitalsId) {
            await databases.updateCollection(dbId, vitalsId, 'Vitals', perms, false);
            console.log('✅ Fixed Vitals permissions');
        }
        
        if(dbId && docsId) {
            await databases.updateCollection(dbId, docsId, 'Documents', perms, false);
            console.log('✅ Fixed Documents permissions');
        }
        
        if(bucketId) {
            await storage.updateBucket(bucketId, 'MedicalRecords', perms);
            console.log('✅ Fixed Storage Bucket permissions');
        }
        console.log('Patch complete!');
    } catch(e) {
        console.error('Migration failed:', e.message);
    }
}
fix();
