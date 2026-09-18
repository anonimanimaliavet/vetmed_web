import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthorizationError } from "@/lib/auth/authorization";
import { ensureVetMedRolesAndPermissions } from "@/lib/auth/vetmed-roles";

const ALLOWED_ROLES = [
  "ADMIN",
  "VETERINARIAN",
  "VETERINARY_DATA_ENTRY",
] as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdmin() {
  await ensureVetMedRolesAndPermissions();

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new AuthorizationError("Oturum gerekli.");
  }

  const user = await db.orm.public.User.first({ id: userId });
  if (!user || !user.is_active) {
    throw new AuthorizationError("Aktif kullanıcı gerekli.");
  }

  const memberships = await db.orm.public.ClinicMembership.where({
    user_id: userId,
    is_active: true,
  }).all();

  if (memberships.length === 0) {
    throw new AuthorizationError("Aktif klinik üyeliği gerekli.");
  }

  const roles = await Promise.all(
    memberships.map((m: any) =>
      db.orm.public.Role.first({ id: m.role_id }),
    ),
  );

  const isAdmin = roles.some((role: any) => role?.name === "ADMIN");
  if (!isAdmin) {
    throw new AuthorizationError("Yalnızca ADMIN kullanıcıları yönetebilir.");
  }

  return { userId };
}

export async function GET() {
  try {
    await requireAdmin();

    const [users, clinics, roles, memberships] = await Promise.all([
      db.orm.public.User.all(),
      db.orm.public.Clinic.where({ is_active: true }).all(),
      db.orm.public.Role.all(),
      db.orm.public.ClinicMembership.all(),
    ]);

    const supportedRoles = roles.filter((role: any) =>
      ALLOWED_ROLES.includes(role?.name),
    );

    const rows = users.map((user: any) => {
      const userMemberships = memberships.filter(
        (membership: any) => membership.user_id === user.id,
      );

      const membership = userMemberships.find(
        (item: any) => item.is_active,
      ) || userMemberships[0] || null;

      const clinic = membership
        ? clinics.find((item: any) => item.id === membership.clinic_id)
        : null;

      const role = membership
        ? roles.find((item: any) => item.id === membership.role_id)
        : null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.is_active,
        clinicId: clinic?.id || membership?.clinic_id || null,
        clinicName: clinic?.name || null,
        roleName: role?.name || null,
        membershipId: membership?.id || null,
        membershipActive: membership?.is_active || false,
      };
    });

    return NextResponse.json({
      ok: true,
      users: rows,
      clinics: clinics.map((clinic: any) => ({
        id: clinic.id,
        name: clinic.name,
      })),
      roles: supportedRoles.map((role: any) => ({
        id: role.id,
        name: role.name,
      })),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 403 },
      );
    }

    console.error("GET /api/admin/users failed", error);
    return NextResponse.json(
      { ok: false, error: "Kullanıcılar alınamadı." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId: adminUserId } = await requireAdmin();
    const body = await request.json();

    const userId = text(body?.userId);
    const clinicId = text(body?.clinicId);
    const roleName = text(body?.roleName);
    const activate =
      typeof body?.activate === "boolean" ? body.activate : true;

    if (!userId || !clinicId || !roleName) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kullanıcı, klinik ve rol seçilmelidir.",
        },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_ROLES.includes(
        roleName as (typeof ALLOWED_ROLES)[number],
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz rol." },
        { status: 400 },
      );
    }

    const target = await db.orm.public.User.first({ id: userId });
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 },
      );
    }

    const clinic = await db.orm.public.Clinic.first({
      id: clinicId,
      is_active: true,
    });

    if (!clinic) {
      return NextResponse.json(
        { ok: false, error: "Klinik bulunamadı veya pasif." },
        { status: 400 },
      );
    }

    const role = await db.orm.public.Role.first({ name: roleName });
    if (!role) {
      return NextResponse.json(
        { ok: false, error: "Rol bulunamadı." },
        { status: 400 },
      );
    }

    const memberships = await db.orm.public.ClinicMembership.where({
      user_id: userId,
    }).all();

    let membership = memberships.find(
      (item: any) => item.clinic_id === clinicId,
    );

    if (membership) {
      await db.orm.public.ClinicMembership.where({
        id: membership.id,
      }).update({
        role_id: role.id,
        is_active: activate,
      });
    } else {
      membership = await db.orm.public.ClinicMembership.create({
        user_id: userId,
        clinic_id: clinicId,
        role_id: role.id,
        is_active: activate,
      });
    }

    // A user is login-eligible only when both the user and a clinic
    // membership are active.
    await db.orm.public.User.where({ id: userId }).update({
      is_active: activate,
      security_stamp: crypto.randomUUID(),
    });

    console.log(
      "ADMIN user assignment",
      JSON.stringify({
        adminUserId,
        targetUserId: userId,
        clinicId,
        roleName,
        activate,
      }),
    );

    return NextResponse.json({
      ok: true,
      message: activate
        ? "Kullanıcı klinik ve rol ile etkinleştirildi."
        : "Kullanıcı pasifleştirildi.",
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 403 },
      );
    }

    console.error("PATCH /api/admin/users failed", error);
    return NextResponse.json(
      { ok: false, error: "Kullanıcı güncellenemedi." },
      { status: 500 },
    );
  }
}