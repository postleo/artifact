import { firestore, wrapDoc } from '../db.js';

// Local mirror of each prop record (the agent-system owns the source of truth).
// Namespaced collection to avoid clashing with the agent's own 'props' documents
// in the shared Firestore database.
const col = firestore.collection('app_props');

export interface PropAttributes {
  id: string;
  name: string;
  description: string;
  status: string;
  brief: any;
  options: any;
  selection: any;
  final_assets: any;
  cost: any;
  flags: any;
  job_id?: string | null;
}

const DEFAULTS = {
  status: 'generating_options',
  options: [] as any[],
  selection: null as any,
  final_assets: null as any,
  cost: { nb2_images: 0, nbpro_images: 0, est_usd: 0.0 },
  flags: { trademark_risk: 'none', moderation: 'clean', budget_exceeded: false },
  job_id: null as string | null,
};

export class Prop {
  static async findAll() {
    const snap = await col.get();
    return snap.docs.map((d) => wrapDoc(col.doc(d.id), d.data() as PropAttributes));
  }

  static async findByPk(id: string) {
    const ref = col.doc(id);
    const snap = await ref.get();
    return snap.exists ? wrapDoc(ref, snap.data() as PropAttributes) : null;
  }

  static async create(data: Partial<PropAttributes> & { id: string }) {
    const record = { ...DEFAULTS, ...data } as PropAttributes;
    // Use merge so this write never clobbers fields written concurrently by the
    // Kafka prop-event consumer (e.g. agent_status / last_event_revision). Kafka
    // events can create the doc before the REST create path finishes awaiting the
    // agent's response; a non-merge set() would wipe the consumer's fields.
    await col.doc(data.id).set(record, { merge: true });
    return wrapDoc(col.doc(data.id), record);
  }
}
