import { FieldValue, Query, Timestamp } from "firebase-admin/firestore";
import { RelationTuple } from "../types/RelationTuple.types";
import { collections, db } from "config";

export class TupleStore {

  async create(tuple: RelationTuple): Promise<void> {
    await collections.rebac_tuples.doc(tuple.id).set({
      ...tuple,
      createdAt: FieldValue.serverTimestamp()
    });
  }
  
  async findExact(tuple: Partial<RelationTuple>): Promise<RelationTuple | null> {
    const query = collections.rebac_tuples
      .where('tenantId', '==', tuple.tenantId)
      .where('subject', '==', tuple.subject)
      .where('relation', '==', tuple.relation)
      .where('object', '==', tuple.object)
      .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : snapshot.docs[0].data() as RelationTuple;
  }
  
  async find(filter: Partial<RelationTuple>): Promise<RelationTuple[]> {
    let query: Query = collections.rebac_tuples;
    
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
    const snap = collections.rebac_tuples.doc(id).get();
    return snap;
  }

  async delete(id: string): Promise<void> {
    await collections.rebac_tuples.doc(id).delete();
  }
  
  /**
   * Nettoie les tuples expirés
   */
  async cleanupExpired(): Promise<number> {
    const now = Timestamp.now();
    const query = collections.rebac_tuples
      .where('expiresAt', '<=', now)
      .limit(500);
    
    const snapshot = await query.get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.size;
  }
}
