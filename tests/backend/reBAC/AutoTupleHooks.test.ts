import {
  autoCreateEventCreatorTuple,
  autoCreateOrganizationMemberTuple,
  autoCreateOrganizationOwnerTuple,
  autoCreateOrganizationRelationTuple,
  autoCreateProjectAssignmentTuple,
} from "rebac/hooks/AutoTupleHooks";
import { getReBACService } from "rebac/services/ReBACServiceFactory";

jest.mock("rebac/services/ReBACServiceFactory", () => ({
  getReBACService: jest.fn(),
}));

jest.mock("firebase-admin/firestore", () => ({
  Timestamp: { now: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })) },
}));

const writeMock = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeMock.mockClear();
  (getReBACService as jest.Mock).mockReturnValue({ write: writeMock });
});

describe("AutoTupleHooks", () => {
  it("creates a tuple for organization owner", async () => {
    const created = await autoCreateOrganizationOwnerTuple({
      tenantId: "tenant-1",
      userId: "user-1",
    });

    expect(created).toBe(true);
    expect(writeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        relation: "owner",
        object: { type: "organization", id: "tenant-1" },
        subject: expect.objectContaining({ id: "user-1" }),
      }),
      undefined
    );
  });

  it("adds metadata for organization member tuples", async () => {
    await autoCreateOrganizationMemberTuple({
      tenantId: "tenant-1",
      userId: "user-2",
      role: "admin",
      actor: { userId: "admin-1" },
    });

    expect(writeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        relation: "member",
        metadata: expect.objectContaining({ role: "admin" }),
      }),
      expect.objectContaining({ userId: "admin-1" })
    );
  });

  it("supports generic organization relations", async () => {
    await autoCreateOrganizationRelationTuple({
      tenantId: "tenant-1",
      userId: "user-99",
      relation: "manager",
      metadata: { custom: true },
    });

    expect(writeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        relation: "manager",
        metadata: expect.objectContaining({ custom: true }),
      }),
      undefined
    );
  });

  it("skips event tuples when tenantId is missing", async () => {
    const created = await autoCreateEventCreatorTuple({
      eventId: "event-1",
      creatorId: "user-3",
    });

    expect(created).toBe(false);
    expect(writeMock).not.toHaveBeenCalled();
  });

  it("creates event creator tuple when tenant is provided", async () => {
    await autoCreateEventCreatorTuple({
      tenantId: "tenant-2",
      eventId: "event-99",
      creatorId: "user-9",
      metadata: { type: "workshop" },
    });

    expect(writeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        relation: "creator",
        tenantId: "tenant-2",
        object: { type: "event", id: "event-99" },
      }),
      undefined
    );
  });

  it("creates tuples for project assignments", async () => {
    await autoCreateProjectAssignmentTuple({
      tenantId: "tenant-3",
      projectId: "project-1",
      employeeId: "employee-1",
      actor: { userId: "manager-1" },
    });

    expect(writeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        relation: "assigned_to",
        object: { type: "project", id: "project-1" },
        subject: expect.objectContaining({ id: "employee-1" }),
      }),
      expect.objectContaining({ userId: "manager-1" })
    );
  });
});
