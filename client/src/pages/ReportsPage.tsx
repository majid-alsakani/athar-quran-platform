import AppFrame from "@/components/AppFrame";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CalendarClock, Download, FileClock, FileSpreadsheet, Loader2, Pause, Play, RefreshCw, Send } from "lucide-react";
import { useState } from "react";

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const members = trpc.organization.members.useQuery(undefined, { enabled: user?.role === "admin" });
  const schedules = trpc.reports.listSchedules.useQuery(undefined, { enabled: user?.role === "admin" });
  const csv = trpc.reports.exportCsv.useQuery(undefined, { enabled: false });
  const [guardianId, setGuardianId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [cron, setCron] = useState("0 0 16 * * 5");
  const weekly = trpc.reports.generateWeekly.useMutation({ onSuccess: () => { utils.notifications.mine.invalidate(); } });
  const activate = trpc.reports.activateWeeklySchedule.useMutation({ onSuccess: () => { utils.reports.listSchedules.invalidate(); } });
  const toggleSchedule = trpc.reports.pauseWeeklySchedule.useMutation({ onSuccess: () => { utils.reports.listSchedules.invalidate(); } });
  const guardians = members.data?.filter(member => member.role === "guardian") ?? [];
  const students = members.data?.filter(member => member.role === "student") ?? [];
  const canSchedule = typeof window !== "undefined" && !window.location.hostname.includes("manus.computer");
  const exportCsv = async () => { const result = await csv.refetch(); if (result.data) downloadCsv(result.data.filename, result.data.content); };

  if (user?.role !== "admin" && user?.role !== "teacher") return <AppFrame eyebrow="التقارير" title="تقارير محمية" description="التقارير التفصيلية متاحة فقط للأدوار المخولة، بينما يمكن للطالب وولي الأمر عرض تقدمهم من صفحة التقدم."><div className="rounded-3xl border border-[#eadfcb] bg-[#fffaf1] p-7 text-[#6f5a35]">استخدم صفحة «التقدم» لعرض التقارير المرتبطة بحسابك.</div></AppFrame>;
  if (members.error) return <AppFrame eyebrow="التقارير والتصدير" title="تعذر تحميل المستخدمين" description="تحقق من اتصالك ثم أعد المحاولة."><div className="rounded-3xl border border-[#f2d4d1] bg-[#fff8f7] p-7 text-center"><AlertCircle className="mx-auto size-8 text-red-600" /><p className="mt-3 text-sm text-red-700">{members.error.message}</p><Button onClick={() => members.refetch()} variant="outline" className="mt-4 rounded-xl"><RefreshCw className="size-4" />إعادة المحاولة</Button></div></AppFrame>;

  return (
    <AppFrame eyebrow="التقارير والتصدير" title="متابعة قابلة للقياس" description="أنشئ تقريراً أسبوعياً لولي الأمر، وجدوله تلقائياً بعد النشر، أو صدّر سجلات التقدم كملف CSV.">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#dfe8e1] bg-white p-6 shadow-[0_16px_40px_-34px_rgba(21,58,48,0.5)]"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#eaf2eb] text-[#2d6759]"><FileClock className="size-5" /></span><h2 className="mt-5 font-display text-xl font-semibold text-[#193a31]">تقرير أسبوعي داخل المنصة</h2><p className="mt-2 text-sm leading-7 text-[#718078]">ينشئ ملخصاً للحضور والمتابعة ويضع إشعاراً لولي الأمر ضمن حسابه.</p>{user.role === "admin" ? <div className="mt-5 space-y-3"><select value={guardianId} onChange={event => setGuardianId(event.target.value)} className="form-input"><option value="">اختر ولي الأمر</option>{guardians.map(item => <option key={item.id} value={item.id}>{item.name ?? item.email ?? `ولي أمر #${item.id}`}</option>)}</select><select value={studentId} onChange={event => setStudentId(event.target.value)} className="form-input"><option value="">اختر الطالب</option>{students.map(item => <option key={item.id} value={item.id}>{item.name ?? item.email ?? `طالب #${item.id}`}</option>)}</select><Button disabled={!guardianId || !studentId || weekly.isPending} onClick={() => weekly.mutate({ guardianId: Number(guardianId), studentId: Number(studentId) })} className="h-11 w-full rounded-xl bg-[#276654] text-white hover:bg-[#1e5545]">{weekly.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" />إنشاء التقرير وإشعار ولي الأمر</>}</Button>{weekly.data ? <p className="rounded-xl bg-[#eef7f0] p-3 text-sm text-[#2e6c58]">{weekly.data.summary}</p> : null}{weekly.error ? <p className="text-sm text-red-700">{weekly.error.message}</p> : null}</div> : <p className="mt-5 rounded-xl bg-[#fafcfb] p-4 text-sm text-[#77837c]">يمكن للمعلم تسجيل التقدم، بينما ينشئ المدير التقرير الأسبوعي لولي الأمر.</p>}</section>
        <section className="rounded-3xl border border-[#dfe8e1] bg-[#193a31] p-6 text-white shadow-[0_18px_45px_-30px_rgba(21,58,48,0.7)]"><span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#e8d7a7]"><FileSpreadsheet className="size-5" /></span><h2 className="mt-5 font-display text-xl font-semibold">تصدير CSV للمدير</h2><p className="mt-2 text-sm leading-7 text-white/70">يتم التصدير فقط من نطاق مؤسسة المدير، ويحوي سجلات التقدم دون كشف بيانات مؤسسة أخرى.</p>{user.role === "admin" ? <Button disabled={csv.isFetching} onClick={exportCsv} className="mt-5 h-11 rounded-xl bg-[#e8d7a7] text-[#263b32] hover:bg-[#f2e2b5]">{csv.isFetching ? <Loader2 className="size-4 animate-spin" /> : <><Download className="size-4" />تنزيل التقرير CSV</>}</Button> : <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">تصدير CSV متاح للمدير فقط.</p>}</section>
      </div>
      {user.role === "admin" ? <section className="rounded-3xl border border-[#dfe8e1] bg-white p-6 shadow-[0_16px_40px_-34px_rgba(21,58,48,0.5)]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><span className="flex size-11 items-center justify-center rounded-2xl bg-[#f7efdf] text-[#916e32]"><CalendarClock className="size-5" /></span><h2 className="mt-5 font-display text-xl font-semibold text-[#193a31]">إرسال أسبوعي تلقائي</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-[#718078]">ينشئ النظام إشعاراً أسبوعياً لولي الأمر ويمنع التكرار عند إعادة المحاولة. الجدولة تعمل فقط بعد نشر الموقع لأن مشغّل المهام يستدعي عنوان النسخة العامة.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${canSchedule ? "bg-[#edf5ef] text-[#2e6c58]" : "bg-[#fff4de] text-[#875f27]"}`}>{canSchedule ? "جاهز للتفعيل" : "يتطلب نشر المنصة"}</span></div><div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]"><select value={guardianId} onChange={event => setGuardianId(event.target.value)} className="form-input"><option value="">ولي الأمر</option>{guardians.map(item => <option key={item.id} value={item.id}>{item.name ?? item.email ?? `ولي أمر #${item.id}`}</option>)}</select><select value={studentId} onChange={event => setStudentId(event.target.value)} className="form-input"><option value="">الطالب</option>{students.map(item => <option key={item.id} value={item.id}>{item.name ?? item.email ?? `طالب #${item.id}`}</option>)}</select><input value={cron} onChange={event => setCron(event.target.value)} className="form-input" aria-label="وقت التشغيل وفق cron UTC" title="مثال: 0 0 16 * * 5 = الجمعة 16:00 UTC" /><Button disabled={!canSchedule || !guardianId || !studentId || activate.isPending} onClick={() => activate.mutate({ guardianId: Number(guardianId), studentId: Number(studentId), cron })} className="mt-2 h-11 rounded-xl bg-[#276654] text-white hover:bg-[#1e5545] lg:mt-0">{activate.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Play className="size-4" />تفعيل أسبوعي</>}</Button></div>{!canSchedule ? <p className="mt-3 text-xs leading-6 text-[#8a6a32]">أكمل النشر أولاً، ثم افتح هذه الصفحة في النسخة العامة لتفعيل الجدولة.</p> : null}{activate.error ? <p className="mt-3 text-sm text-red-700">{activate.error.message}</p> : null}<div className="mt-6 space-y-2">{schedules.isLoading ? <Loader2 className="size-5 animate-spin text-[#276654]" /> : schedules.error ? <button onClick={() => schedules.refetch()} className="text-sm text-red-700">تعذر تحميل الجداول — إعادة المحاولة</button> : schedules.data?.length ? schedules.data.map(schedule => <div key={schedule.id} className="flex flex-col gap-3 rounded-2xl border border-[#e7eee9] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#29483e]">تقرير مجدول #{schedule.id}</p><p className="mt-1 text-xs text-[#77837c]">Cron UTC: {schedule.cron} · {schedule.isEnabled ? "مفعّل" : "متوقف"}</p></div><Button variant="outline" disabled={toggleSchedule.isPending} onClick={() => toggleSchedule.mutate({ scheduleId: schedule.id, enabled: !schedule.isEnabled })} className="rounded-xl">{schedule.isEnabled ? <><Pause className="size-4" />إيقاف</> : <><Play className="size-4" />استئناف</>}</Button></div>) : <p className="rounded-2xl bg-[#fafcfb] p-4 text-sm text-[#77837c]">لم تُفعّل أي تقارير أسبوعية تلقائية بعد.</p>}</div></section> : null}
    </AppFrame>
  );
}
