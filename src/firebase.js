import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);
const app = firebaseEnabled ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
const database = app ? getFirestore(app) : null;
const LOCAL_PREFIX = 'homecare:';
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase());

const isConfiguredAdmin = (email) => ADMIN_EMAILS.includes(email?.toLowerCase());

const readLocal = (name, fallback = []) => {
  try {
    const stored = localStorage.getItem(`${LOCAL_PREFIX}${name}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (name, rows) => localStorage.setItem(`${LOCAL_PREFIX}${name}`, JSON.stringify(rows));

export async function loadRows(name, fallback = [], currentUser = null) {
  if (!database) {
    const rows = readLocal(name, fallback);
    return name === 'users' ? rows.map(({ passwordHash, ...user }) => user) : rows;
  }
  let source = collection(database, name);
  if (name === 'bookings') {
    if (!currentUser) return [];
    if (currentUser.role !== 'admin') source = query(source, where('userId', '==', currentUser.uid));
  }
  const snapshot = await getDocs(source);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveRow(name, row) {
  const id = row.id || crypto.randomUUID();
  const record = { ...row, id };
  if (database) await setDoc(doc(database, name, id), record);
  else {
    const rows = readLocal(name);
    writeLocal(name, [...rows.filter((item) => item.id !== id), record]);
  }
  return record;
}

export async function addRow(name, row) {
  if (database) {
    const reference = await addDoc(collection(database, name), row);
    return { ...row, id: reference.id };
  }
  const record = { ...row, id: crypto.randomUUID() };
  writeLocal(name, [...readLocal(name), record]);
  return record;
}

export async function updateRow(name, id, updates) {
  if (database) await updateDoc(doc(database, name, id), updates);
  else writeLocal(name, readLocal(name).map((item) => item.id === id ? { ...item, ...updates } : item));
}

export async function deleteRow(name, id) {
  if (database) await deleteDoc(doc(database, name, id));
  else writeLocal(name, readLocal(name).filter((item) => item.id !== id));
}

export async function signInWithGoogle() {
  if (!auth) throw new Error('Google sign-in requires Firebase configuration.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const { user } = result;
  let profile = {
    id: user.uid,
    name: user.displayName || 'HomeCare customer',
    email: user.email || '',
    role: 'customer',
    createdAt: new Date().toISOString(),
  };
  try {
    const snapshot = await getDoc(doc(database, 'users', user.uid));
    if (snapshot.exists()) profile = snapshot.data();
    else await saveRow('users', profile);
  } catch {
    // Firestore profile setup must not undo a successful Google sign-in.
  }
  return {
    uid: user.uid,
    name: profile.name || user.displayName || 'HomeCare customer',
    email: user.email || '',
    role: profile.role === 'admin' || isConfiguredAdmin(user.email) ? 'admin' : 'customer',
  };
}

export async function logout() {
  if (auth) await signOut(auth);
}

export function watchAuth(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null);
    let profile = {};
    try {
      const snapshot = await getDoc(doc(database, 'users', user.uid));
      if (snapshot.exists()) profile = snapshot.data();
    } catch { /* The signed-in experience can continue without an optional profile read. */ }
    callback({
      uid: user.uid,
      name: profile.name || user.displayName || user.email?.split('@')[0] || 'HomeCare customer',
      email: user.email || '',
      role: profile.role === 'admin' || isConfiguredAdmin(user.email) ? 'admin' : 'customer',
    });
  });
}
