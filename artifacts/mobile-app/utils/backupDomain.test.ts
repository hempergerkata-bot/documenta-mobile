import { canonicalizeManifest, classifyBackupMerge, contentAddressedFileKey, detectChangedItems, excludeSecrets, isLatestPointerEligible, retainSnapshots, stripRestoreNotificationMetadata, type BackupManifest } from './backupDomain';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
assert(canonicalizeManifest({ z: 1, a: { token: 'no', b: 2 } }) === '{"a":{"b":2},"z":1}', 'canonicalization sorts keys and excludes nested secrets');
assert(contentAddressedFileKey('ABC123', '.PDF') === 'files/ab/abc123.pdf', 'content keys are deterministic');
const changes = detectChangedItems([{ id: 'a', value: 2 }, { id: 'b', value: 1 }], [{ id: 'a', value: 1 }, { id: 'c', value: 1 }]);
assert(changes.changed.length === 1 && changes.added[0]?.id === 'b' && changes.removedIds[0] === 'c', 'incremental changes are detected');
const manifests = ['1', '3', '2', '4'].map(id => ({ schemaVersion: 1 as const, id, createdAt: `2026-01-0${id}T00:00:00.000Z`, files: [], state: {}, stateHash: 'state', completedAt: '2026-01-01T00:00:00.000Z' }));
assert(retainSnapshots(manifests, 2).map(item => item.id).join(',') === '4,3', 'retention keeps newest snapshots');
const complete = manifests[0] as BackupManifest;
assert(isLatestPointerEligible(complete), 'only complete valid manifests may update latest');
assert(classifyBackupMerge({ entityId: 'x', entityType: 'document', base: { v: 1 }, local: { v: 2 }, remote: { v: 3 } }).type === 'manual_correction_required', 'divergent edits require manual correction');
assert(classifyBackupMerge({ entityId: 'x', entityType: 'document', base: { v: 1 }, local: { v: 1 }, remote: { v: 2 } }).resolution === 'use_remote', 'one-sided remote edit is classified');
const safe = stripRestoreNotificationMetadata(excludeSecrets({ integrations: { notificationInstances: [{ nativeId: 'device' }], notificationRules: [{ enabled: true }], notificationToken: 'no' } }));
assert(!('notificationInstances' in (safe as { integrations: object }).integrations) && 'notificationRules' in (safe as { integrations: object }).integrations && !JSON.stringify(safe).includes('notificationToken'), 'restore removes native notification metadata and secrets');
console.log('backup domain tests passed');