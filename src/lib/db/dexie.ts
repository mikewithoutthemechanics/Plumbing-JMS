import Dexie, { type Table } from 'dexie';
import type { JobCard, JobMaterial, TimeLog, SyncQueueItem, Profile, Customer, Material } from '@/types';

export class PlumbingDB extends Dexie {
  profiles!: Table<Profile, string>;
  customers!: Table<Customer, string>;
  materials!: Table<Material, string>;
  jobCards!: Table<JobCard, string>;
  jobMaterials!: Table<JobMaterial, string>;
  timeLogs!: Table<TimeLog, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('plumbing-jms');
this.version(1).stores({
       profiles: 'id, email, role, created_at',
       customers: 'id, name, created_at',
       materials: 'id, name, is_active, created_at',
       jobCards: 'id, job_number, customer_id, assigned_to, status, created_at',
       jobMaterials: 'id, job_card_id, material_id, created_at',
       timeLogs: 'id, job_card_id, technician_id, clock_in, created_at',
       syncQueue: 'id, table_name, status, timestamp',
     });
  }
}

export const db = new PlumbingDB();

export async function queueSync(table_name: SyncQueueItem['table_name'], operation: SyncQueueItem['operation'], payload: Record<string, unknown>) {
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    table_name,
    operation,
    payload,
    timestamp: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  });
}

export async function getPendingSyncItems() {
  return db.syncQueue.where('status').equals('pending').toArray();
}

export async function markSyncItemDone(id: string) {
  await db.syncQueue.delete(id);
}

export async function markSyncItemFailed(id: string) {
  const item = await db.syncQueue.get(id);
  if (item) {
    await db.syncQueue.update(id, { status: 'failed', retries: item.retries + 1 });
  }
}
