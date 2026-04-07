import { Client, Account, Databases, Storage } from 'appwrite';

export const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || 'YOUR_PROJECT_ID'); // Replace with your actual project ID

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const APPWRITE_CONFIG = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    vitalsCollectionId: import.meta.env.VITE_APPWRITE_VITALS_COLLECTION_ID,
    docsCollectionId: import.meta.env.VITE_APPWRITE_DOCS_COLLECTION_ID,
    recordsBucketId: import.meta.env.VITE_APPWRITE_RECORDS_BUCKET_ID,
    linksCollectionId: import.meta.env.VITE_APPWRITE_LINKS_COLLECTION_ID,
};
