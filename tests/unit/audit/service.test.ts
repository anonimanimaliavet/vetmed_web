import { beforeEach, describe, expect, it, vi } from "vitest";

const { auditCreate } = vi.hoisted(() => ({
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    orm: {
      public: {
        AuditLog: {
          create: auditCreate,
        },
      },
    },
  },
}));

import { writeAuditLog } from "@/lib/audit/service";

describe("writeAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    auditCreate.mockResolvedValue({
      id: "audit-1",
      action: "users.read",
    });
  });

  it("creates an audit record with tenant context", async () => {
    await writeAuditLog({
      actorUserId: "user-1",
      clinicId: "clinic-1",
      action: "patient.read",
      resourceType: "Patient",
      resourceId: "patient-1",
      success: true,
      ipAddress: "127.0.0.1",
      correlationId: "corr-1",
      metadata: {
        source: "dashboard",
        resultCount: 1,
      },
    });

    expect(auditCreate).toHaveBeenCalledWith({
      actor_user_id: "user-1",
      clinic_id: "clinic-1",
      action: "patient.read",
      resource_type: "Patient",
      resource_id: "patient-1",
      success: true,
      ip_address: "127.0.0.1",
      correlation_id: "corr-1",
      metadata: {
        source: "dashboard",
        resultCount: 1,
      },
    });
  });

  it("rejects sensitive metadata keys", async () => {
    await expect(
      writeAuditLog({
        action: "auth.login",
        resourceType: "User",
        success: false,
        metadata: {
          password: "secret",
        },
      }),
    ).rejects.toThrow("Sensitive audit metadata key rejected");

    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("rejects nested sensitive metadata", async () => {
    await expect(
      writeAuditLog({
        action: "auth.login",
        resourceType: "User",
        success: false,
        metadata: {
          details: {
            access_token: "secret",
          },
        },
      }),
    ).rejects.toThrow("Sensitive audit metadata key rejected");

    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("requires an action", async () => {
    await expect(
      writeAuditLog({
        action: " ",
        resourceType: "User",
        success: true,
      }),
    ).rejects.toThrow("Audit action is required");
  });

  it("requires a resource type", async () => {
    await expect(
      writeAuditLog({
        action: "users.read",
        resourceType: " ",
        success: true,
      }),
    ).rejects.toThrow("Audit resource type is required");
  });
});