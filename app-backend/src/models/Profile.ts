import { firestore, wrapDoc } from '../db.js';

// Production profile — a single document. Stored in a namespaced collection so it
// never collides with the agent-system's own Firestore collections.
const col = firestore.collection('app_profiles');
const DOC_ID = 'default';

export interface ProfileAttributes {
  projectName: string;
  worldLore: string;
  departmentRole: string;
  leadName: string;
}

export class Profile {
  static async findOne() {
    const snap = await col.doc(DOC_ID).get();
    return snap.exists ? wrapDoc(col.doc(DOC_ID), snap.data() as ProfileAttributes) : null;
  }

  static async create(data: ProfileAttributes) {
    await col.doc(DOC_ID).set(data);
    return wrapDoc(col.doc(DOC_ID), data);
  }
}
