import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Offline sync queue for storing mutations when offline
 */

interface QueuedAction {
  id: string;
  timestamp: number;
  action: string;
  payload: any;
  status: 'pending' | 'synced' | 'failed';
  retries: number;
}

interface OfflineSyncDB extends DBSchema {
  queue: {
    key: string;
    value: QueuedAction;
  };
}

let db: IDBPDatabase<OfflineSyncDB> | null = null;

/**
 * Initialize IndexedDB for offline storage
 */
export async function initOfflineSync() {
  if (db) return db;

  db = await openDB<OfflineSyncDB>('lateen-notes-offline', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    },
  });

  return db;
}

/**
 * Add action to offline queue
 */
export async function queueAction(action: string, payload: any) {
  const database = await initOfflineSync();

  const queuedAction: QueuedAction = {
    id: `${action}-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    action,
    payload,
    status: 'pending',
    retries: 0,
  };

  await database.add('queue', queuedAction);
  return queuedAction.id;
}

/**
 * Get all pending actions from queue
 */
export async function getPendingActions() {
  const database = await initOfflineSync();
  const allActions = await database.getAll('queue');
  return allActions.filter(a => a.status === 'pending');
}

/**
 * Mark action as synced
 */
export async function markActionSynced(actionId: string) {
  const database = await initOfflineSync();
  const action = await database.get('queue', actionId);
  
  if (action) {
    action.status = 'synced';
    await database.put('queue', action);
  }
}

/**
 * Mark action as failed
 */
export async function markActionFailed(actionId: string) {
  const database = await initOfflineSync();
  const action = await database.get('queue', actionId);
  
  if (action) {
    action.status = 'failed';
    action.retries += 1;
    await database.put('queue', action);
  }
}

/**
 * Remove action from queue
 */
export async function removeAction(actionId: string) {
  const database = await initOfflineSync();
  await database.delete('queue', actionId);
}

/**
 * Clear all synced actions
 */
export async function clearSyncedActions() {
  const database = await initOfflineSync();
  const allActions = await database.getAll('queue');
  
  for (const action of allActions) {
    if (action.status === 'synced') {
      await database.delete('queue', action.id);
    }
  }
}

/**
 * Get sync status
 */
export async function getSyncStatus() {
  const database = await initOfflineSync();
  const allActions = await database.getAll('queue');
  
  return {
    total: allActions.length,
    pending: allActions.filter(a => a.status === 'pending').length,
    synced: allActions.filter(a => a.status === 'synced').length,
    failed: allActions.filter(a => a.status === 'failed').length,
  };
}

/**
 * Listen for online/offline events
 */
export function setupOnlineListener(onOnline: () => void, onOffline: () => void) {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Check if app is online
 */
export function isOnline() {
  return navigator.onLine;
}
