import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, collection, getDoc, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

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
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Database: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper function to compress large Base64 images to avoid exceeding memory/storage limits
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

// Concrete Firestore operations connected to real Firebase DB
export async function saveUsersToFirestore(users: any[]) {
  try {
    for (const user of users) {
      if (!user.id) continue;
      await setDoc(doc(db, 'users', user.id), user);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users');
  }
}

export async function deleteUserFromFirestore(userId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}

export async function saveProfilesToFirestore(allProfiles: { [userId: string]: any[] }) {
  try {
    for (const [userId, profiles] of Object.entries(allProfiles)) {
      await setDoc(doc(db, 'profiles', userId), {
        userId,
        profiles
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `profiles`);
  }
}

export async function saveMoviesToFirestore(movies: any[]) {
  try {
    for (const movie of movies) {
      if (!movie.id) continue;
      await setDoc(doc(db, 'movies', movie.id), movie);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'movies');
  }
}

export async function saveSingleMovieToFirestore(movie: any) {
  try {
    if (!movie.id) return;
    await setDoc(doc(db, 'movies', movie.id), movie);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `movies/${movie.id}`);
  }
}

export async function deleteMovieFromFirestore(movieId: string) {
  try {
    await deleteDoc(doc(db, 'movies', movieId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `movies/${movieId}`);
  }
}

export async function saveSettingsToFirestore(adguardEnabled: boolean) {
  try {
    await setDoc(doc(db, 'settings', 'global'), {
      id: 'global',
      adguardEnabled
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/global');
  }
}

export async function saveRequestsToFirestore(requests: any[]) {
  try {
    for (const req of requests) {
      if (!req.id) continue;
      await setDoc(doc(db, 'requests', req.id), req);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'requests');
  }
}

export async function deleteRequestFromFirestore(requestId: string) {
  try {
    await deleteDoc(doc(db, 'requests', requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `requests/${requestId}`);
  }
}
