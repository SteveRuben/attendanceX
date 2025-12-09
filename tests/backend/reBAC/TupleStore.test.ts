import { TupleStore } from "../../../backend/functions/src/rebac/services/TupleStore";
import { RelationTuple } from "../../../backend/functions/src/rebac/types/RelationTuple.types";
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Timestamp } from "firebase-admin/firestore";



export const firestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

export default {
  firestore: () => firestore,
};


describe("TupleStore", () => {
  let store: TupleStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new TupleStore();
  });

  it("create() should save a tuple", async () => {
    const tuple: RelationTuple = {
      id: "123",
      tenantId: "t1",
      subject: { type: "user", id: "u1" },
      relation: "viewer",
      object: { type: "document", id: "d1" },
      source: 'system',
      createdAt: Timestamp.now()
    };

    await store.create(tuple);

    expect(firestore.collection).toHaveBeenCalledWith("rebac_tuples");
    expect(firestore.doc).toHaveBeenCalledWith("123");
    expect(firestore.set).toHaveBeenCalledWith(tuple);
  });

  it("getById() should return the tuple data", async () => {
    const fakeSnap = { data: () => ({ ok: true }) };
    firestore.get.mockResolvedValue(fakeSnap);

    const result = await store.getById("123");
    expect(result).toEqual({ ok: true });
  });

  it("delete() should remove a tuple", async () => {
    await store.delete("123");

    expect(firestore.collection).toHaveBeenCalledWith("rebac_tuples");
    expect(firestore.doc).toHaveBeenCalledWith("123");
    expect(firestore.delete).toHaveBeenCalled();
  });
});
