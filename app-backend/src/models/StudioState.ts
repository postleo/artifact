import { firestore, wrapDoc } from '../db.js';

// Key/value store for the studio UI's persisted state (production profile + props
// slate), replacing browser localStorage. Namespaced collection.
const col = firestore.collection('app_studio_state');

export interface StudioStateAttributes {
  value: any;
}

export class StudioState {
  static async findByPk(key: string) {
    const ref = col.doc(key);
    const snap = await ref.get();
    return snap.exists ? wrapDoc(ref, snap.data() as StudioStateAttributes) : null;
  }

  static async upsert(rec: { key: string; value: any }) {
    await col.doc(rec.key).set({ value: rec.value });
  }
}
