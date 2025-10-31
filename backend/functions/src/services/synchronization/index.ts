/**
 * Index des services de synchronisation
 */

export { autoImportService } from './auto-import.service';
export { presenceSyncService } from './presence-sync.service';
export { dataCoherenceService } from './data-coherence.service';

// Exports des classes pour les tests
export { AutoImportService } from './auto-import.service';
export { PresenceSyncService } from './presence-sync.service';
export { DataCoherenceService } from './data-coherence.service';

export type {
    ImportJob,
    ImportError,
    ImportWarning,
    PreFillConfiguration,
    ConvertedTimeEntry
} from './auto-import.service';

export type {
    PresenceEntry,
    PresenceBreak,
    SyncResult as PresenceSyncResult,
    SyncConflict,
    SyncConfiguration
} from './presence-sync.service';

export type {
    CoherenceCheck,
    CoherenceIssue
} from './data-coherence.service';