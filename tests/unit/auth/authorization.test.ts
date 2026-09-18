
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockAuth = vi.fn();

const mockUserFirst = vi.fn();
const mockClinicFirst = vi.fn();
const mockMembershipFirst = vi.fn();
const mockPermissionFirst = vi.fn();
const mockRolePermissionFirst = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    orm: {
      public: {
        User: {
          first: mockUserFirst,
        },
        Clinic: {
          first: mockClinicFirst,
        },
        ClinicMembership: {
          first: mockMembershipFirst,
        },
        Permission: {
          first: mockPermissionFirst,
        },
        RolePermission: {
          first: mockRolePermissionFirst,
        },
      },
    },
  },
}));

describe("Authorization security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("allows an active user with an active clinic membership and permission", async () => {
    mockUserFirst.mockResolvedValue({
      id: "user-a",
      email: "admin@vetmed.local",
      is_active: true,
      security_stamp: "current-stamp",
    });

    mockClinicFirst.mockResolvedValue({
      id: "clinic-a",
      organization_id: "org-a",
      name: "Ana Klinik",
      is_active: true,
    });

    mockMembershipFirst.mockResolvedValue({
      id: "membership-a",
      user_id: "user-a",
      clinic_id: "clinic-a",
      role_id: "role-admin",
      is_active: true,
    });

    mockPermissionFirst.mockResolvedValue({
      id: "permission-users-read",
      action: "users.read",
    });

    mockRolePermissionFirst.mockResolvedValue({
      role_id: "role-admin",
      permission_id: "permission-users-read",
    });

    const { authorizePermission } =
      await import("@/lib/auth/authorization");

    const result = await authorizePermission(
      {
        userId: "user-a",
        activeClinicId: "clinic-a",
      },
      "users.read",
    );

    expect(result.clinicId).toBe("clinic-a");
    expect(result.permission).toBe("users.read");
  });

  test("denies an inactive user", async () => {
    mockUserFirst.mockResolvedValue(null);

    const { authorizePermission, AuthorizationError } =
      await import("@/lib/auth/authorization");

    await expect(
      authorizePermission(
        {
          userId: "inactive-user",
          activeClinicId: "clinic-a",
        },
        "users.read",
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(mockClinicFirst).not.toHaveBeenCalled();
    expect(mockMembershipFirst).not.toHaveBeenCalled();
  });

  test("denies an inactive clinic", async () => {
    mockUserFirst.mockResolvedValue({
      id: "user-a",
      email: "admin@vetmed.local",
      is_active: true,
      security_stamp: "current-stamp",
    });

    mockClinicFirst.mockResolvedValue(null);

    const { authorizePermission, AuthorizationError } =
      await import("@/lib/auth/authorization");

    await expect(
      authorizePermission(
        {
          userId: "user-a",
          activeClinicId: "clinic-inactive",
        },
        "users.read",
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(mockMembershipFirst).not.toHaveBeenCalled();
  });

  test("denies an inactive or missing clinic membership", async () => {
    mockUserFirst.mockResolvedValue({
      id: "user-a",
      email: "admin@vetmed.local",
      is_active: true,
      security_stamp: "current-stamp",
    });

    mockClinicFirst.mockResolvedValue({
      id: "clinic-b",
      organization_id: "org-a",
      name: "Kapalı Klinik",
      is_active: true,
    });

    mockMembershipFirst.mockResolvedValue(null);

    const { authorizePermission, AuthorizationError } =
      await import("@/lib/auth/authorization");

    await expect(
      authorizePermission(
        {
          userId: "user-a",
          activeClinicId: "clinic-b",
        },
        "users.read",
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(mockPermissionFirst).not.toHaveBeenCalled();
  });

  test("denies when the role does not have the requested permission", async () => {
    mockUserFirst.mockResolvedValue({
      id: "user-a",
      email: "admin@vetmed.local",
      is_active: true,
      security_stamp: "current-stamp",
    });

    mockClinicFirst.mockResolvedValue({
      id: "clinic-a",
      organization_id: "org-a",
      name: "Ana Klinik",
      is_active: true,
    });

    mockMembershipFirst.mockResolvedValue({
      id: "membership-a",
      user_id: "user-a",
      clinic_id: "clinic-a",
      role_id: "role-veterinarian",
      is_active: true,
    });

    mockPermissionFirst.mockResolvedValue({
      id: "permission-users-manage",
      action: "users.manage",
    });

    mockRolePermissionFirst.mockResolvedValue(null);

    const { authorizePermission, AuthorizationError } =
      await import("@/lib/auth/authorization");

    await expect(
      authorizePermission(
        {
          userId: "user-a",
          activeClinicId: "clinic-a",
        },
        "users.manage",
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  test("denies a session with a stale security stamp", async () => {
    mockUserFirst.mockResolvedValue({
      id: "user-a",
      email: "admin@vetmed.local",
      is_active: true,
      security_stamp: "current-stamp",
    });

    const { authorizePermission, AuthorizationError } =
      await import("@/lib/auth/authorization");

    await expect(
      authorizePermission(
        {
          userId: "user-a",
          activeClinicId: "clinic-a",
          securityStamp: "old-stamp",
        },
        "users.read",
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(mockClinicFirst).not.toHaveBeenCalled();
    expect(mockMembershipFirst).not.toHaveBeenCalled();
  });

  test("uses the authenticated clinic id and does not trust a different membership clinic", async () => {
    mockUserFirst.mockResolvedValue({
      id: "user-a",
      email: "admin@vetmed.local",
      is_active: true,
      security_stamp: "current-stamp",
    });

    mockClinicFirst.mockResolvedValue({
      id: "clinic-a",
      organization_id: "org-a",
      name: "Ana Klinik",
      is_active: true,
    });

    mockMembershipFirst.mockResolvedValue({
      id: "membership-a",
      user_id: "user-a",
      clinic_id: "clinic-a",
      role_id: "role-admin",
      is_active: true,
    });

    mockPermissionFirst.mockResolvedValue({
      id: "permission-users-read",
      action: "users.read",
    });

    mockRolePermissionFirst.mockResolvedValue({
      role_id: "role-admin",
      permission_id: "permission-users-read",
    });

    const { authorizePermission } =
      await import("@/lib/auth/authorization");

    const result = await authorizePermission(
      {
        userId: "user-a",
        activeClinicId: "clinic-a",
      },
      "users.read",
    );

    expect(mockClinicFirst).toHaveBeenCalledWith({
      id: "clinic-a",
      is_active: true,
    });

    expect(mockMembershipFirst).toHaveBeenCalledWith({
      user_id: "user-a",
      clinic_id: "clinic-a",
      is_active: true,
    });

    expect(result.clinicId).toBe("clinic-a");
  });

  test("rejects an unknown permission before checking role permission", async () => {
    mockUserFirst.mockResolvedValue({
      id: "user-a",
      email: "admin@vetmed.local",
      is_active: true,
      security_stamp: "current-stamp",
    });

    mockClinicFirst.mockResolvedValue({
      id: "clinic-a",
      organization_id: "org-a",
      name: "Ana Klinik",
      is_active: true,
    });

    mockMembershipFirst.mockResolvedValue({
      id: "membership-a",
      user_id: "user-a",
      clinic_id: "clinic-a",
      role_id: "role-admin",
      is_active: true,
    });

    mockPermissionFirst.mockResolvedValue(null);

    const { authorizePermission, AuthorizationError } =
      await import("@/lib/auth/authorization");

    await expect(
      authorizePermission(
        {
          userId: "user-a",
          activeClinicId: "clinic-a",
        },
        "unknown.permission",
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(mockRolePermissionFirst).not.toHaveBeenCalled();
  });
});
