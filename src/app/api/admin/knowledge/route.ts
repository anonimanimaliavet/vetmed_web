import { NextResponse } from "next/server";
import { AuthorizationError, requirePermission } from "@/lib/auth/authorization";
import { ensureVetMedRolesAndPermissions } from "@/lib/auth/vetmed-roles";
import { db } from "@/lib/db";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    await ensureVetMedRolesAndPermissions();
    const a = await requirePermission("knowledge.manage");

    const rows = await db.orm.public.CaseKnowledgeRecord.where({
      clinic_id: a.clinicId,
    }).all();

    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }

    console.error(error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureVetMedRolesAndPermissions();
    const a = await requirePermission("knowledge.manage");
    const body = await request.json();
    const id = text(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id zorunludur." },
        { status: 400 },
      );
    }

    const record = await db.orm.public.CaseKnowledgeRecord.first({
      id,
      clinic_id: a.clinicId,
    });

    if (!record) {
      return NextResponse.json(
        { ok: false, error: "Bilgi kaydı bulunamadı." },
        { status: 404 },
      );
    }

    const patch: Record<string, unknown> = {};

    if (typeof body?.diagnosisName === "string") patch.diagnosis_name = text(body.diagnosisName);
    if (typeof body?.diagnosisCode === "string") patch.diagnosis_code = text(body.diagnosisCode) || null;
    if (typeof body?.evidenceNote === "string") patch.evidence_note = text(body.evidenceNote) || null;
    if (typeof body?.history === "string") patch.history = text(body.history) || null;
    if (body?.findings !== undefined) patch.findings_json = body.findings;
    if (body?.labs !== undefined) patch.labs_json = body.labs;
    if (body?.imaging !== undefined) patch.imaging_json = body.imaging;
    if (typeof body?.status === "string" && ["PENDING", "APPROVED", "REJECTED"].includes(body.status)) {
      patch.status = body.status;
    }

    patch.reviewer_user_id = a.user.id;
    patch.reviewed_at = new Date();

    await db.orm.public.CaseKnowledgeRecord.where({
      id,
      clinic_id: a.clinicId,
    }).update(patch as any);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }

    console.error(error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureVetMedRolesAndPermissions();
    const a = await requirePermission("knowledge.manage");
    const body = await request.json();
    const id = text(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id zorunludur." },
        { status: 400 },
      );
    }

    const record = await db.orm.public.CaseKnowledgeRecord.first({
      id,
      clinic_id: a.clinicId,
    });

    if (!record) {
      return NextResponse.json(
        { ok: false, error: "Bilgi kaydı bulunamadı." },
        { status: 404 },
      );
    }

    await db.orm.public.CaseKnowledgeRecord.where({
      id,
      clinic_id: a.clinicId,
    }).delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }

    console.error(error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}