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
  console.error('Offline Database: ', JSON.stringify(errInfo));
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

// Stub mock functions since Firebase is removed. They immediately resolve.
export async function saveUsersToFirestore(users: any[]) {
  return Promise.resolve();
}

export async function deleteUserFromFirestore(userId: string) {
  return Promise.resolve();
}

export async function saveProfilesToFirestore(allProfiles: { [userId: string]: any[] }) {
  return Promise.resolve();
}

export async function saveMoviesToFirestore(movies: any[]) {
  return Promise.resolve();
}

export async function deleteMovieFromFirestore(movieId: string) {
  return Promise.resolve();
}

export async function saveSettingsToFirestore(adguardEnabled: boolean) {
  return Promise.resolve();
}

export const db = null as any;
