import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.APPWRITE_API_KEY) {
    console.error('❌ Error: APPWRITE_API_KEY is missing in .env.local');
    console.error('Please create an API Key in Appwrite Console with database and storage permissions, and add it to .env.local');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function setup() {
    console.log('🚀 Starting HealthVault Database Setup...');
    try {
        // Create Database
        const db = await databases.create(ID.unique(), 'HealthVault');
        console.log(`✅ Database created: ${db.$id}`);

        const perms = [
            Permission.read(Role.users()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
        ];

        // Create Vitals Collection
        const vitals = await databases.createCollection(db.$id, ID.unique(), 'Vitals', perms);
        console.log(`✅ Collection created: Vitals (${vitals.$id})`);
        
        await databases.createStringAttribute(db.$id, vitals.$id, 'userId', 50, true);
        await databases.createIntegerAttribute(db.$id, vitals.$id, 'heartRate', false);
        await databases.createIntegerAttribute(db.$id, vitals.$id, 'systolic', false);
        await databases.createIntegerAttribute(db.$id, vitals.$id, 'diastolic', false);
        await databases.createFloatAttribute(db.$id, vitals.$id, 'weight', false);
        await databases.createFloatAttribute(db.$id, vitals.$id, 'bloodSugar', false);
        await databases.createDatetimeAttribute(db.$id, vitals.$id, 'date', false);
        console.log('✅ Vitals attributes created.');

        // Create Documents Collection
        const docs = await databases.createCollection(db.$id, ID.unique(), 'Documents', perms);
        console.log(`✅ Collection created: Documents (${docs.$id})`);
        
        await databases.createStringAttribute(db.$id, docs.$id, 'userId', 50, true);
        await databases.createStringAttribute(db.$id, docs.$id, 'fileId', 50, true);
        await databases.createStringAttribute(db.$id, docs.$id, 'type', 50, true); // 'prescription', 'lab_report'
        await databases.createStringAttribute(db.$id, docs.$id, 'name', 255, true);
        console.log('✅ Documents attributes created.');

        // Create Storage Bucket
        const bucket = await storage.createBucket(ID.unique(), 'MedicalRecords', perms);
        console.log(`✅ Storage Bucket created: MedicalRecords (${bucket.$id})`);

        console.log('\n🎉 Setup Complete! Please copy these IDs into your .env.local:');
        console.log(`VITE_APPWRITE_DATABASE_ID=${db.$id}`);
        console.log(`VITE_APPWRITE_VITALS_COLLECTION_ID=${vitals.$id}`);
        console.log(`VITE_APPWRITE_DOCS_COLLECTION_ID=${docs.$id}`);
        console.log(`VITE_APPWRITE_RECORDS_BUCKET_ID=${bucket.$id}`);
        
    } catch (error) {
        console.error('\n❌ Error during setup:', error.message);
    }
}

setup();
