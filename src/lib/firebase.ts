import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific database ID as requested
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper function to compress large Base64 images to avoid exceeding Firestore's 1MB document limit
export function compressImage(base64Str: string, maxWidth = 150, maxHeight = 150): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Compress as JPEG 70% quality, which is extremely lightweight (~10KB-15KB)
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

// Helper function to save users, profiles, and catalog persistently to Firestore
export async function saveUsersToFirestore(users: any[]) {
  const path = 'users';
  try {
    for (const u of users) {
      if (!u || !u.id) continue;
      const docRef = doc(db, 'users', u.id);
      
      let avatarUrl = u.avatarUrl || '';
      if (avatarUrl && avatarUrl.startsWith('data:image') && avatarUrl.length > 50000) {
        try {
          avatarUrl = await compressImage(avatarUrl);
        } catch (e) {
          console.warn('Failsafe compression failed for user', u.id, e);
        }
      }

      await setDoc(docRef, {
        id: u.id,
        name: u.name || '',
        email: (u.email || '').toLowerCase().trim(),
        password: (u.password || '').toString(),
        isAdmin: !!u.isAdmin,
        avatarUrl: avatarUrl,
        createdAt: u.createdAt || new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteUserFromFirestore(userId: string) {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    // Setting a deleted flag or deleting doc
    await setDoc(docRef, { deleted: true }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveProfilesToFirestore(allProfiles: { [userId: string]: any[] }) {
  const path = 'profiles';
  try {
    for (const [userId, profiles] of Object.entries(allProfiles)) {
      if (!userId) continue;
      const docRef = doc(db, 'profiles', userId);
      
      const processedProfiles = [];
      for (const p of profiles) {
        let avatarUrl = p.avatarUrl || '';
        if (avatarUrl && avatarUrl.startsWith('data:image') && avatarUrl.length > 50000) {
          try {
            avatarUrl = await compressImage(avatarUrl);
          } catch (e) {
            console.warn('Failsafe compression failed for profile', userId, e);
          }
        }
        processedProfiles.push({
          ...p,
          avatarUrl
        });
      }

      await setDoc(docRef, {
        userId,
        profiles: processedProfiles || []
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveMoviesToFirestore(movies: any[]) {
  const path = 'movies';
  try {
    for (const m of movies) {
      if (!m || !m.id) continue;
      const docRef = doc(db, 'movies', m.id);
      await setDoc(docRef, {
        id: m.id,
        title: m.title || '',
        description: m.description || '',
        type: m.type || 'movie',
        category: m.category || '',
        tmdbId: m.tmdbId || '',
        clicksCount: m.clicksCount || 0,
        votesLikes: m.votesLikes || 0,
        votesDislikes: m.votesDislikes || 0,
        trailerUrl: m.trailerUrl || '',
        releaseYear: m.releaseYear || '',
        duration: m.duration || '',
        cast: m.cast || []
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMovieFromFirestore(movieId: string) {
  const path = `movies/${movieId}`;
  try {
    const docRef = doc(db, 'movies', movieId);
    await setDoc(docRef, { deleted: true }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveSettingsToFirestore(adguardEnabled: boolean) {
  const path = 'settings/global';
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, {
      id: 'global',
      adguardEnabled
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
