import express, { Request, RequestHandler } from "express";
import request from "supertest";
import { requirePermission } from "../../../../backend/functions/src/middleware/auth";
import { setReBACService } from "../../../../backend/functions/src/rebac/services/ReBACServiceFactory";
import type { ReBACService } from "../../../../backend/functions/src/rebac/services/ReBACService";

type ReBACServiceMock = Pick<ReBACService, "check">;

const DEFAULT_ROUTE = "/resource/:docId?";

describe("requirePermission middleware (ReBAC)", () => {
  let rebacServiceMock: jest.Mocked<ReBACServiceMock>;

  beforeEach(() => {
    rebacServiceMock = {
      check: jest.fn(),
    };
    setReBACService(rebacServiceMock as unknown as ReBACService);
  });

  afterEach(() => {
    setReBACService(null);
    jest.clearAllMocks();
  });

  const createTestApp = (options?: {
    handler?: RequestHandler;
    configureRequest?: (req: Request & { tenantContext?: any }) => void;
  }) => {
    const app = express();
    app.use(express.json());

    app.use((req, _res, next) => {
      (req as any).user = {
        uid: "user-1",
        email: "user@example.com",
        role: "admin",
        permissions: { view_reports: true },
        sessionId: "session-123",
      };
      (req as any).tenantContext = {
        tenantId: "tenant-1",
        tenant: { id: "tenant-1" },
      };
      options?.configureRequest?.(req as Request & { tenantContext?: any });
      next();
    });

    app.get(
      DEFAULT_ROUTE,
      options?.handler ?? requirePermission("view_reports"),
      (_req, res) => {
        res.json({ success: true });
      }
    );

    return app;
  };

  it("invokes ReBAC service with normalized subject/object references", async () => {
    rebacServiceMock.check.mockResolvedValue(true);
    const app = createTestApp();

    await request(app).get("/resource").expect(200);

    expect(rebacServiceMock.check).toHaveBeenCalledWith(
      "user:user-1",
      "view_reports",
      "organization:tenant-1",
      expect.objectContaining({
        tenantId: "tenant-1",
        userId: "user-1",
      })
    );
  });

  it("denies request when ReBAC returns false", async () => {
    rebacServiceMock.check.mockResolvedValue(false);
    const app = createTestApp();

    const response = await request(app).get("/resource").expect(403);
    expect(response.body.error).toBe("INSUFFICIENT_PERMISSIONS");
  });

  it("returns 500 when ReBAC throws an error", async () => {
    rebacServiceMock.check.mockRejectedValue(new Error("boom"));
    const app = createTestApp();

    const response = await request(app).get("/resource").expect(500);
    expect(response.body.error).toBe("INTERNAL_SERVER_ERROR");
  });

  it("falls back to legacy permissions when tenant context is missing", async () => {
    const app = createTestApp({
      configureRequest: (req) => {
        delete req.tenantContext;
        (req as any).user.permissions = { view_reports: true };
      },
    });

    await request(app).get("/resource").expect(200);
    expect(rebacServiceMock.check).not.toHaveBeenCalled();
  });

  it("rejects legacy requests when the user lacks the permission flag", async () => {
    const app = createTestApp({
      configureRequest: (req) => {
        delete req.tenantContext;
        (req as any).user.permissions = {};
      },
    });

    const response = await request(app).get("/resource").expect(403);
    expect(response.body.error).toBe("INSUFFICIENT_PERMISSIONS");
    expect(rebacServiceMock.check).not.toHaveBeenCalled();
  });

  it("supports custom object resolvers", async () => {
    rebacServiceMock.check.mockResolvedValue(true);
    const handler = requirePermission({
      permission: "view_document",
      object: (req: Request) => ({
        namespace: "document",
        id: req.params.docId,
      }),
    });
    const app = createTestApp({ handler });

    await request(app).get("/resource/doc-9").expect(200);

    expect(rebacServiceMock.check).toHaveBeenCalledWith(
      "user:user-1",
      "view_document",
      "document:doc-9",
      expect.any(Object)
    );
  });

  it("merges additional context provided by the route", async () => {
    rebacServiceMock.check.mockResolvedValue(true);
    const handler = requirePermission({
      permission: "view_reports",
      context: () => ({ level: 4 }),
    });
    const app = createTestApp({ handler });

    await request(app).get("/resource").expect(200);

    expect(rebacServiceMock.check).toHaveBeenCalledWith(
      expect.any(String),
      "view_reports",
      expect.any(String),
      expect.objectContaining({ level: 4 })
    );
  });

  it("returns 400 when an invalid object reference is provided", async () => {
    const handler = requirePermission({
      permission: "view_reports",
      object: "invalid-object-ref",
    });
    const app = createTestApp({ handler });

    const response = await request(app).get("/resource").expect(400);
    expect(response.body.error).toBe("BAD_REQUEST");
  });
});
