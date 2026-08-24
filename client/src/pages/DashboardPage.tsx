import AppFrame from "@/components/AppFrame";
import QueryError from "@/components/QueryError";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Bell, BookOpenCheck, CalendarDays, ChevronLeft, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

function OrganizationSetup() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const utils = trpc.useUtils();
  const create = trpc.organization.create.useMutation({
    onSuccess: () => {
      utils.organization.current.invalidate();
      utils.dashboard.overview.invalidate();
      setLocation("/app/circles");
    },
  });

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-[#dde7df] bg-white p-7 shadow-[0_20px_55px_-40px_rgba(21,58,48,0.65)]">
      <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-[#e8f0ea] text-[#276654]"><BookOpenCheck className="size-6" /></div>
      <h2 className="font-display text-2xl font-semibold text-[#193a31]">لنبدأ بتعريف المؤسسة</h2>
      <p className="mt-2 text-sm leading-7 text-[#68736d]">هذه الخطوة تربط الحساب الإداري بالمؤسسة وتحمي بيانات كل حلقة ضمن نطاقها الصحيح.</p>
      <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); create.mutate({ name, city: city || undefined }); }}>
        <label className="form-label">اسم المؤسسة<input required value={name} onChange={event => setName(event.target.value)} className="form-input" placeholder="مثال: جمعية النور لتحفيظ القرآن" /></label>
        <label className="form-label">المدينة <span className="font-normal text-[#8a9690]">(اختياري)</span><input value={city} onChange={event => setCity(event.target.value)} className="form-input" placeholder="مثال: صنعاء" /></label>
        {create.error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{create.error.message}</p> : null}
        <Button disabled={create.isPending} className="h-11 w-full rounded-xl bg-[#276654] text-white hover:bg-[#1e5545]">{create.isPending ? <Loader2 className="size-4 animate-spin" /> : "إنشاء المؤسسة والبدء"}</Button>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const organization = trpc.organization.current.useQuery(undefined, { enabled: Boolean(user) });
  const overview = trpc.dashboard.overview.useQuery(undefined, { enabled: Boolean(user?.organizationId) });
  const [, setLocation] = useLocation();

  if (loading || organization.isLoading) {
    return <AppFrame eyebrow="لوحة التحكم" title="مرحباً بك" description="نجهّز مساحة عملك الآمنة."><div className="grid place-items-center rounded-3xl bg-white py-20"><Loader2 className="size-7 animate-spin text-[#276654]" /></div></AppFrame>;
  }
  if (!user) return null;
  if (organization.error) {
    return <AppFrame eyebrow="لوحة التحكم" title="تعذر تحميل المؤسسة" description="تحقق من اتصالك ثم أعد المحاولة."><QueryError message={organization.error.message} onRetry={() => organization.refetch()} /></AppFrame>;
  }
  if (!user.organizationId) {
    return (
      <AppFrame eyebrow="إعداد أولي" title="أثر يبدأ من مؤسسة منظمة" description="أنشئ المؤسسة أولاً، ثم أضف المستخدمين والحلقات حسب دور كل مستخدم.">
        {user.role === "admin" ? <OrganizationSetup /> : <div className="rounded-3xl border border-[#eadfcb] bg-[#fffaf1] p-7 text-[#6f5a35]"><h2 className="font-display text-xl font-semibold">بانتظار ربط الحساب</h2><p className="mt-2 text-sm leading-7">سجّل الدخول بحسابك ثم اطلب من مدير المؤسسة إضافتك بالدور المناسب.</p></div>}
      </AppFrame>
    );
  }
  if (overview.error) {
    return <AppFrame eyebrow="لوحة التحكم" title="تعذر تحميل الملخص" description="تحقق من اتصالك ثم أعد المحاولة."><QueryError message={overview.error.message} onRetry={() => overview.refetch()} /></AppFrame>;
  }
  if (overview.isLoading || !overview.data) {
    return <AppFrame eyebrow="لوحة التحكم" title="ملخص اليوم" description="نحمّل أحدث البيانات ضمن صلاحياتك."><div className="grid place-items-center rounded-3xl bg-white py-20"><Loader2 className="size-7 animate-spin text-[#276654]" /></div></AppFrame>;
  }

  const iconCycle = [BookOpenCheck, Users, Bell, CalendarDays];
  let activity: React.ReactNode = <div className="py-10 text-center text-sm text-[#7c8881]">لا توجد عناصر جديدة الآن. أضف حلقة أو جلسة للبدء.</div>;
  if ("upcoming" in overview.data && (overview.data.upcoming?.length ?? 0) > 0) {
    activity = (overview.data.upcoming ?? []).map(row => (
      <div key={row.sessions.id} className="flex items-center justify-between gap-4 py-4">
        <div><p className="font-semibold text-[#29483e]">{row.sessions.title}</p><p className="mt-1 text-xs text-[#7d8882]">{row.circles.name} · {new Date(row.sessions.startsAt).toLocaleDateString("ar-SA")}</p></div>
        <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#2f6d58]">{row.sessions.status === "completed" ? "مكتملة" : "مجدولة"}</span>
      </div>
    ));
  } else if ("circles" in overview.data && (overview.data.circles?.length ?? 0) > 0) {
    activity = (overview.data.circles ?? []).map(circle => (
      <button onClick={() => setLocation("/app/sessions")} key={circle.id} className="flex w-full items-center justify-between gap-4 py-4 text-right">
        <div><p className="font-semibold text-[#29483e]">{circle.name}</p><p className="mt-1 text-xs text-[#7d8882]">{circle.mosqueName} · {circle.meetingSummary}</p></div><ChevronLeft className="size-4 text-[#9a7b47]" />
      </button>
    ));
  } else if ("children" in overview.data && (overview.data.children?.length ?? 0) > 0) {
    activity = (overview.data.children ?? []).map(child => (
      <button onClick={() => setLocation("/app/progress")} key={child.id} className="flex w-full items-center justify-between gap-4 py-4 text-right">
        <div><p className="font-semibold text-[#29483e]">{child.name ?? "طالب"}</p><p className="mt-1 text-xs text-[#7d8882]">استعرض التقرير الأسبوعي وسجل المتابعة</p></div><ChevronLeft className="size-4 text-[#9a7b47]" />
      </button>
    ));
  }

  return (
    <AppFrame eyebrow="لوحة التحكم" title={`أهلاً ${user.name ?? "بك"}`} description="نظرة مركزة على ما يحتاج انتباهك اليوم، وفق نطاق دورك في المؤسسة." action={<Button onClick={() => setLocation(user.role === "teacher" || user.role === "admin" ? "/app/sessions" : "/app/progress")} className="h-10 rounded-xl bg-[#276654] px-4 text-white hover:bg-[#1e5545]">{user.role === "teacher" || user.role === "admin" ? "فتح جلسة اليوم" : "متابعة التقدم"}<ChevronLeft className="size-4" /></Button>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{overview.data.metrics.map((metric, index) => <StatCard key={metric.label} label={metric.label} value={metric.value} icon={iconCycle[index % iconCycle.length]} tone={index === 1 ? "sand" : index === 2 ? "ink" : "sage"} />)}</div>
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-3xl border border-[#dde7df] bg-white p-6 shadow-[0_16px_40px_-34px_rgba(21,58,48,0.5)]"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold text-[#193a31]">المتابعة القريبة</h2><p className="mt-1 text-sm text-[#77837c]">الجلسات والتقارير التي تحتاج متابعة.</p></div><CalendarDays className="size-5 text-[#82714f]" /></div><div className="mt-5 divide-y divide-[#edf1ed]">{activity}</div></section>
        <section className="rounded-3xl border border-[#dde7df] bg-[#193a31] p-6 text-white shadow-[0_18px_45px_-30px_rgba(21,58,48,0.7)]"><div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[0.17em] text-[#cfc095]">تحديثاتك</p><h2 className="mt-2 font-display text-xl font-semibold">الإشعارات الأخيرة</h2></div><Bell className="size-5 text-[#e6d4a5]" /></div><div className="mt-5 space-y-3">{overview.data.notifications.length ? overview.data.notifications.map(note => <div key={note.id} className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-sm font-semibold">{note.title}</p><p className="mt-1 text-xs leading-6 text-white/70">{note.body}</p></div>) : <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/70">ستظهر هنا تنبيهات الحضور والتقدم والتقرير الأسبوعي عند وجود بيانات.</p>}</div><button onClick={() => setLocation("/app/notifications")} className="mt-5 text-sm font-semibold text-[#e6d4a5]">عرض كل الإشعارات ←</button></section>
      </div>
    </AppFrame>
  );
}
