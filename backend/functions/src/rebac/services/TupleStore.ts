import { FieldValue, Firestore, Query, Timestamp } from "firebase-admin/firestore";
import { RelationTuple } from "../types/RelationTuple.types";

export class TupleStore {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }
  
  /**
   * Collection Firestore pour les tuples
   * Index composites:
   * - tenantId + subject + relation + object
   * - tenantId + object + relation
   * - tenantId + subject + object
   */
  private get collection() {
    return this.db.collection('rebac_tuples');
  }
  
  async create(tuple: RelationTuple): Promise<void> {
    await this.collection.doc(tuple.id).set({
      ...tuple,
      createdAt: FieldValue.serverTimestamp()
    });
  }
  
  async findExact(tuple: Partial<RelationTuple>): Promise<RelationTuple | null> {
    const query = this.collection
      .where('tenantId', '==', tuple.tenantId)
      .where('subject', '==', tuple.subject)
      .where('relation', '==', tuple.relation)
      .where('object', '==', tuple.object)
      .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : snapshot.docs[0].data() as RelationTuple;
  }
  
  async find(filter: Partial<RelationTuple>): Promise<RelationTuple[]> {
    let query: Query = this.collection;
    
    if (filter.tenantId) {
      query = query.where('tenantId', '==', filter.tenantId);
    }
    if (filter.subject) {
      query = query.where('subject', '==', filter.subject);
    }
    if (filter.relation) {
      query = query.where('relation', '==', filter.relation);
    }
    if (filter.object) {
      query = query.where('object', '==', filter.object);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as RelationTuple);
  }
  
  async getById(id: string) {
    const snap = this.collection.doc(id).get();
    return snap;
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
  
  /**
   * Nettoie les tuples expirés
   */
  async cleanupExpired(): Promise<number> {
    const now = Timestamp.now();
    const query = this.collection
      .where('expiresAt', '<=', now)
      .limit(500);
    
    const snapshot = await query.get();
    const batch = this.db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.size;
  }
}
