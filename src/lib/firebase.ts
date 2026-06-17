/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const db = null as any;
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
  console.warn('Silent Local Storage Mode active - database operation bypassed safely.');
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

// Helper to recursively strip undefined properties
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

// Fully stubbed safe synchronous functions that allow App.tsx to work offline with absolute zero errors
export async function saveUsersToFirestore(users: any[]) {}
export async function deleteUserFromFirestore(userId: string) {}
export async function saveProfilesToFirestore(allProfiles: any) {}
export async function saveMoviesToFirestore(movies: any[]) {}
export async function saveSingleMovieToFirestore(movie: any) {}
export async function deleteMovieFromFirestore(movieId: string) {}
export async function saveSettingsToFirestore(adguardEnabled: boolean) {}
export async function saveRequestsToFirestore(requests: any[]) {}
export async function deleteRequestFromFirestore(requestId: string) {}
export async function saveSingleNotificationToFirestore(notif: any) {}
export async function deleteNotificationFromFirestore(notificationId: string) {}
