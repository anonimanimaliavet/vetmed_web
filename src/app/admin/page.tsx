import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getDashboardContext } from "@/lib/auth/dashboard-access";

export default async function AdminDashboardPage() {
  const context = await getDashboardContext();

  if (!context) {
    redirect("/login");
  }

  if (context.role !== "ADMIN") {
    redirect("/user");
  }

  const [users, clinics, knowledge] = await Promise.all([
    db.orm.public.User.all(),
    db.orm.public.Clinic.where({ is_active: true }).all(),
    db.orm.public.CaseKnowledgeRecord.where({
      review_status: "PENDING",
    }).all(),
  ]);

  const activeUsers = (users as any[]).filter((item) => item.is_active).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-sky-700">VetMed Yönetim</p>
          <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Yönetici Paneli
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Kullanıcı, klinik, rol ve klinik bilgi havuzu yönetimi.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {context.name} · ADMIN
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Kullanıcı
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {activeUsers}
            </p>
            <p className="mt-1 text-sm text-slate-500">Aktif hesap</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Klinik
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {clinics.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">Aktif klinik</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Bilgi havuzu
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {knowledge.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">Bekleyen kayıt</p>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/admin/users"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-xl">
              👥
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Kullanıcı Yönetimi
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Yeni kayıtları görüntüle, klinik ata, rol ata, hesabı etkinleştir veya pasifleştir.
            </p>
            <span className="mt-5 inline-flex text-sm font-semibold text-sky-700">
              Yönet →
            </span>
          </Link>

          <Link
            href="/admin/knowledge"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
              🧠
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Klinik Bilgi Havuzu
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Vaka kaynaklı kayıtları incele, doğrula ve kullanıma aç. Onaysız kayıtlar danışmana otomatik eklenmez.
            </p>
            <span className="mt-5 inline-flex text-sm font-semibold text-emerald-700">
              Bilgi havuzuna git →
            </span>
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-xl">
              🛡️
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Rol ve Yetki Kontrolü
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              ADMIN, VETERINARIAN ve VETERINARY_DATA_ENTRY hesaplarının erişim sınırlarını yönet.
            </p>
            <p className="mt-5 text-xs font-medium text-slate-400">
              Yetkilendirme sunucu tarafında uygulanır.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-xl">
              🏥
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Klinik Yapısı
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Kullanıcıların bağlı olduğu klinikler ve aktif üyelikler yönetim katmanından kontrol edilir.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-xl">
              📋
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Denetim ve Güvenlik
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Kritik yönetim işlemleri sunucu tarafında doğrulanır ve audit altyapısına bağlanabilir.
            </p>
          </div>

          <Link
            href="/clinical-advisor"
            className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm transition hover:bg-sky-100"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl">
              🩺
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Tanı Danışmanı
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Yönetici hesabı da klinik tanı danışmanını kullanabilir.
            </p>
            <span className="mt-5 inline-flex text-sm font-semibold text-sky-700">
              Danışmanı aç →
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}