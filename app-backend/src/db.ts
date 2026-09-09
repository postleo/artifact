import { Firestore, DocumentReference } from '@google-cloud/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Firestore (Native mode) is fully serverless: no provisioned capacity, no idle
// cost, scales to zero. On Cloud Run it authenticates via Application Default
// Credentials; the project is auto-detected but we set it explicitly when provided.
// For local development, point FIRESTORE_EMULATOR_HOST at the Firestore emulator.
const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || undefined;

export const firestore = new Firestore(projectId ? { projectId } : {});

/**
 * Wrap a Firestore document's data as a plain, JSON-serialisable object that also
 * carries a non-enumerable async `update(patch)` method. This mirrors the small
 * slice of the old Sequelize model API the route handlers rely on (`res.json(doc)`
 * and `doc.update({...})`) so the route layer needs no changes. The hidden method
 * is excluded from JSON responses and from what is persisted back.
 */
export function wrapDoc<T extends Record<string, any>>(
  docRef: DocumentReference,
  data: T
): T & { update: (patch: Partial<T>) => Promise<T> } {
  const obj: any = { ...data };
  Object.defineProperty(obj, 'update', {
    enumerable: false,
    value: async (patch: Record<string, any>) => {
      Object.assign(obj, patch);
      const plain: Record<string, any> = { ...obj }; // enumerable fields only
      await docRef.set(plain, { merge: true });
      return obj;
    },
  });
  return obj;
}

export async function initDatabase() {
  // Firestore is serverless — there is no connection to establish or pool to warm.
  console.log('[Database] Using Firestore (Native mode, serverless, scales to zero).');
}
