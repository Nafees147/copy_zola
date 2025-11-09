import { ImageFile } from '../types';

const DB_NAME = 'ZOLA_AI_ImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'image_files';

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening image store DB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

export async function saveImage(key: string, file: ImageFile): Promise<void> {
  if (!file) return; // Don't save null files
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.put({ key, file });
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Error saving image to IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

export async function getImage(key: string): Promise<ImageFile | null> {
    if (!key) return null;
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
        if (request.result) {
            resolve(request.result.file);
        } else {
            resolve(null);
        }
        };
        request.onerror = () => {
        console.error('Error fetching image from IndexedDB:', request.error);
        reject(request.error);
        };
    });
}

export async function deleteImage(key: string): Promise<void> {
    if (!key) return;
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error(`Error deleting image with key ${key}:`, request.error);
            reject(request.error);
        };
    });
}

export async function clearImages(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await Promise.all(keys.map(key => new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error(`Error deleting image with key ${key}:`, request.error);
            reject(request.error);
        };
    })));
}