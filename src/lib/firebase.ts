/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore utilizando a base de dados correta do usuário
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = null as any;

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
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`[FIRESTORE ERROR] ${operationType} on path: ${path}`, error);
}

// Helper function to compress large Base64 images to avoid exceeding memory/storage limits
export function compressImage(base64Str: string, maxWidth = 600, maxHeight = 600): Promise<string> {
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
      // Compress as JPEG 90% quality, which is extremely crisp and high-fidelity while keeping base64 size manageable
      const compressed = canvas.toDataURL('image/jpeg', 0.90);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

// Helper to recursively strip undefined properties (crucial for Firestore!)
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const clean: any = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }
  return obj;
}

// --- CLOUD FIRESTORE SYNCHRONIZATION WRITERS ---

export async function saveUsersToFirestore(users: any[]) {
  try {
    const batch = writeBatch(db);
    for (const user of users) {
      if (!user.id) continue;
      const ref = doc(db, 'users', user.id);
      batch.set(ref, sanitizeForFirestore(user), { merge: true });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'users');
  }
}

export async function deleteUserFromFirestore(userId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId));
    // Remove também seus perfis cadastrados para manter integridade
    await deleteDoc(doc(db, 'profiles', userId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
  }
}

export async function saveProfilesToFirestore(allProfiles: any) {
  try {
    const batch = writeBatch(db);
    for (const [userId, profilesArray] of Object.entries(allProfiles)) {
      const ref = doc(db, 'profiles', userId);
      batch.set(ref, sanitizeForFirestore({ userId, profiles: profilesArray }), { merge: true });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'profiles');
  }
}

export async function saveMoviesToFirestore(movies: any[]) {
  try {
    const batch = writeBatch(db);
    for (const m of movies) {
      if (!m.id) continue;
      const ref = doc(db, 'movies', m.id);
      batch.set(ref, sanitizeForFirestore(m), { merge: true });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'movies');
  }
}

export async function saveSingleMovieToFirestore(movie: any) {
  try {
    if (!movie.id) return;
    await setDoc(doc(db, 'movies', movie.id), sanitizeForFirestore(movie), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `movies/${movie.id}`);
  }
}

export async function deleteMovieFromFirestore(movieId: string) {
  try {
    await deleteDoc(doc(db, 'movies', movieId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `movies/${movieId}`);
  }
}

export async function saveSettingsToFirestore(adguardEnabled: boolean, pinnedMostDesiredId?: string | null) {
  try {
    const payload: any = { id: 'global', adguardEnabled };
    if (pinnedMostDesiredId !== undefined) {
      payload.pinnedMostDesiredId = pinnedMostDesiredId;
    }
    await setDoc(doc(db, 'settings', 'global'), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/global');
  }
}

export async function saveRequestsToFirestore(requests: any[]) {
  try {
    const batch = writeBatch(db);
    for (const req of requests) {
      if (!req.id) continue;
      const ref = doc(db, 'requests', req.id);
      batch.set(ref, sanitizeForFirestore(req), { merge: true });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'requests');
  }
}

export async function deleteRequestFromFirestore(requestId: string) {
  try {
    await deleteDoc(doc(db, 'requests', requestId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `requests/${requestId}`);
  }
}

export async function saveSingleNotificationToFirestore(notif: any) {
  try {
    if (!notif.id) return;
    await setDoc(doc(db, 'notifications', notif.id), sanitizeForFirestore(notif), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `notifications/${notif.id}`);
  }
}

export async function deleteNotificationFromFirestore(notificationId: string) {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `notifications/${notificationId}`);
  }
}

export async function saveSingleCommentToFirestore(comment: any) {
  try {
    if (!comment.id) return;
    await setDoc(doc(db, 'comments', comment.id), sanitizeForFirestore(comment), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `comments/${comment.id}`);
  }
}

export async function deleteCommentFromFirestore(commentId: string) {
  try {
    await deleteDoc(doc(db, 'comments', commentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `comments/${commentId}`);
  }
}

