
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

export const setAutoMode = async (enabled: boolean) => {
  const autoModeRef = db.ref('autoMode');
  await autoModeRef.set(enabled);
  return { success: true, message: `Auto mode set to ${enabled}` };
};
