import admin from 'firebase-admin';

let initialized = false;

export const initFirebaseAdmin = () => {
  if (initialized) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin env vars missing. Skipping init.', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
    });
    return;
  }
  // Handle escaped newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  initialized = true;
  console.log('Initialized Firebase Admin SDK for project:', projectId);
};

export const verifyIdToken = async (idToken: string) => {
  if (!initialized) initFirebaseAdmin();
  if (!initialized) throw new Error('Firebase Admin not initialized');
  return admin.auth().verifyIdToken(idToken);
};
