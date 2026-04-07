import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function run() {
    try {
        const dbId = process.env.VITE_APPWRITE_DATABASE_ID;
        const perms = [
            Permission.read(Role.users()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
        ];

        console.log("Creating ShareLinks collection...");
        const links = await databases.createCollection(dbId, ID.unique(), 'ShareLinks', perms);
        
        await databases.createStringAttribute(dbId, links.$id, 'userId', 50, true);
        await databases.createStringAttribute(dbId, links.$id, 'name', 255, true);
        await databases.createStringAttribute(dbId, links.$id, 'token', 2048, true);
        await databases.createIntegerAttribute(dbId, links.$id, 'expiresAt', false);
        
        console.log(`SUCCESS! Add this to .env.local:\nVITE_APPWRITE_LINKS_COLLECTION_ID=${links.$id}`);
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

run();
