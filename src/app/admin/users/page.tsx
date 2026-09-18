"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
  clinicId: string | null;
  clinicName: string | null;
  roleName: string | null;
  membershipId: string | null;
  membershipActive: boolean;
};

type Option = {
  id: string;
  name: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [clinics, setClinics] = useState<Option[]>([]);
  const [roles, setRoles] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Record<string, { clinicId: string; roleName: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kullanıcılar alınamadı.");
        return;
      }

      setUsers(data.users || []);
      setClinics(data.clinics || []);
      setRoles(data.roles || []);

      const next: Record<string, { clinicId: string; roleName: string }> = {};
      for (const user of data.users || []) {
        next[user.id] = {
          clinicId: user.clinicId || "",
          roleName: user.roleName || "",
        };
      }
      setSelected(next);
    } catch {
      setError("Yönetim verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setField(
    userId: string,
    field: "clinicId" | "roleName",
    value: string,
  ) {
    setSelected((current) => ({
      ...current,
      [userId]: {
        clinicId: current[userId]?.clinicId || "",
        roleName: current[userId]?.roleName || "",
        [field]: value,
      },
    }));
  }

  async function save(user: UserRow, activate: boolean) {
    const choice = selected[user.id];

    if (!choice?.clinicId || !choice?.roleName) {
      setError("Önce klinik ve rol seçin.");
      return;
    }

    setSaving(user.id);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          clinicId: choice.clinicId,
          roleName: choice.roleName,
          activate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kullanıcı güncellenemedi.");
        return;
      }

      setMessage(data.message || "Kullanıcı güncellendi.");
      await load();
    } catch {
      setError("Kullanıcı güncellenirken bağlantı hatası oluştu.");
    } finally {
      setSaving("");
    }
  }

  const pending = users.filter(
    (user) => !user.isActive || !user.membershipActive,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#0f766e22,transparent_35%),linear-gradient(135deg,#f8fafc,#ecfeff)] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">
            VetMed
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Kullanıcı Yönetimi
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Yeni kayıt olan kullanıcılar burada bekler. Klinik ve rol ataması
            yaptıktan sonra hesabı etkinleştirebilirsiniz.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            {message}
          </div>
        )}

        <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Bekleyen / kayıtlı kullanıcılar
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {pending.length} kullanıcı henüz tam olarak etkinleştirilmemiş.
              </p>
            </div>
            <button
              onClick={load}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
            >
              Yenile
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Kullanıcılar yükleniyor...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Henüz kayıtlı kullanıcı yok.
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const choice = selected[user.id] || {
                  clinicId: user.clinicId || "",
                  roleName: user.roleName || "",
                };
                const active = user.isActive && user.membershipActive;

                return (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-end">
                      <div>
                        <div className="font-bold text-slate-950">
                          {user.name || "İsimsiz kullanıcı"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {user.email}
                        </div>
                        <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {active ? "Aktif" : "Bekliyor"}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600">
                          Klinik
                        </label>
                        <select
                          value={choice.clinicId}
                          onChange={(e) =>
                            setField(user.id, "clinicId", e.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                        >
                          <option value="">Klinik seçin</option>
                          {clinics.map((clinic) => (
                            <option key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600">
                          Rol
                        </label>
                        <select
                          value={choice.roleName}
                          onChange={(e) =>
                            setField(user.id, "roleName", e.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                        >
                          <option value="">Rol seçin</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.name}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          disabled={saving === user.id}
                          onClick={() => save(user, true)}
                          className="flex-1 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                        >
                          {saving === user.id ? "..." : active ? "Güncelle" : "Etkinleştir"}
                        </button>

                        {active && (
                          <button
                            disabled={saving === user.id}
                            onClick={() => save(user, false)}
                            className="rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Pasifleştir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}