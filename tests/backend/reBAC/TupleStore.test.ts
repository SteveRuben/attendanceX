import { TupleStore } from "../../../backend/functions/src/rebac/services/TupleStore";
import { RelationTuple } from "../../../backend/functions/src/rebac/types/RelationTuple.types";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

jest.mock("firebase-admin/firestore", () => {
  const serverTimestamp = jest.fn(() => "SERVER_TIMESTAMP");
  const now = jest.fn(() => "NOW");
  return {
    FieldValue: { serverTimestamp },
    Timestamp: { now },
    Firestore: class {},
    Query: class {}
  };
});

describe("TupleStore", () => {
  const docRef = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn()
  };

  const batch = {
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined)
  };

  const makeSnapshot = (docs: any[]) => ({
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map((data) => ({
      data: () => data,
      ref: { id: data.id }
    }))
  });

  let collection: any;
  let store: TupleStore;

  beforeEach(() => {
    jest.clearAllMocks();

    collection = {
      doc: jest.fn(() => docRef),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn()
    };

    const dbMock = {
      collection: jest.fn(() => collection),
      batch: jest.fn(() => batch)
    } as any;

    store = new TupleStore(dbMock as any);
  });

  it("create() enregistre le tuple avec un timestamp serveur", async () => {
    const tuple: RelationTuple = {
      id: "123",
      tenantId: "t1",
      subject: { type: "user", id: "u1" },
      relation: "viewer",
      object: { type: "document", id: "d1" },
      source: "system",
      createdAt: Timestamp.now() as any
    };

    await store.create(tuple);

    expect(collection.doc).toHaveBeenCalledWith("123");
    expect(FieldValue.serverTimestamp).toHaveBeenCalledTimes(1);
    expect(docRef.set).toHaveBeenCalledWith({
      ...tuple,
      createdAt: "SERVER_TIMESTAMP"
    });
  });

  it("findExact() renvoie le premier tuple correspondant ou null", async () => {
    const tuple: RelationTuple = {
      id: "1",
      tenantId: "t1",
      subject: { type: "user", id: "u1" },
      relation: "viewer",
      object: { type: "doc", id: "d1" },
      source: "system",
      createdAt: "NOW" as any
    };
    collection.get.mockResolvedValueOnce(makeSnapshot([tuple]));

    const found = await store.findExact(tuple);

    expect(collection.where).toHaveBeenCalledTimes(4);
    expect(collection.limit).toHaveBeenCalledWith(1);
    expect(found).toEqual(tuple);

    collection.get.mockResolvedValueOnce(makeSnapshot([]));
    const notFound = await store.findExact(tuple);
    expect(notFound).toBeNull();
  });

  it("find() applique tous les filtres et renvoie les tuples", async () => {
    const tupleA = { id: "a", tenantId: "t1" } as RelationTuple;
    const tupleB = { id: "b", tenantId: "t1" } as RelationTuple;
    collection.get.mockResolvedValue(makeSnapshot([tupleA, tupleB]));

    const results = await store.find({
      tenantId: "t1",
      subject: { type: "user", id: "u1" },
      relation: "viewer",
      object: { type: "doc", id: "d1" }
    });

    expect(collection.where).toHaveBeenCalledWith("tenantId", "==", "t1");
    expect(collection.where).toHaveBeenCalledWith("subject", "==", { type: "user", id: "u1" });
    expect(collection.where).toHaveBeenCalledWith("relation", "==", "viewer");
    expect(collection.where).toHaveBeenCalledWith("object", "==", { type: "doc", id: "d1" });
    expect(results).toEqual([tupleA, tupleB]);
  });

  it("getById() renvoie le snapshot du document", async () => {
    const snap = { data: () => ({ foo: true }) };
    docRef.get.mockResolvedValueOnce(snap);

    const result = await store.getById("id-1");

    expect(collection.doc).toHaveBeenCalledWith("id-1");
    expect(result).toBe(snap);
  });

  it("delete() supprime le document", async () => {
    docRef.delete.mockResolvedValueOnce(undefined);

    await store.delete("deadbeef");

    expect(collection.doc).toHaveBeenCalledWith("deadbeef");
    expect(docRef.delete).toHaveBeenCalledTimes(1);
  });

  it("cleanupExpired() supprime les tuples expirés en lot et renvoie le nombre", async () => {
    const expiredDocs = [{ id: "1" }, { id: "2" }];
    collection.get.mockResolvedValueOnce(makeSnapshot(expiredDocs));

    const deleted = await store.cleanupExpired();

    expect(collection.where).toHaveBeenCalledWith("expiresAt", "<=", "NOW");
    expect(collection.limit).toHaveBeenCalledWith(500);
    expect(batch.delete).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalledTimes(1);
    expect(deleted).toBe(2);
  });
});
