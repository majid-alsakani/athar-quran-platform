import AppFrame from "@/components/AppFrame";
import QueryError from "@/components/QueryError";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Award, BookMarked, CalendarCheck2, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StudentOption = { id: number; name: string | null };

export default function ProgressPage() {
  const { user } = useAuth();
  const overview = trpc.dashboard.overview.useQuery(undefined, { enabled: Boolean(user?.organizationId) });
  const members = trpc.organization.members.useQuery(undefined, { enabled: user?.role === "admin" || user?.role === "teacher" });
  const circles = trpc.circles.list.useQuery(undefined, { enabled: user?.role === "teacher" });
  const [circleId, setCircleId] = useState<number | null>(null);
  const activeCircleId = circleId ?? circles.data?.[0]?.id ?? null;
  const teacherStudents = trpc.circles.students.useQuery({ circleId: activeCircleId ?? 0 }, { enabled: user?.role === "teacher" && Boolean(activeCircleId) });
  const [studentId, setStudentId] = useState<number | null>(null);

  const students = useMemo<StudentOption[]>(() => {
    if (!user) return [];
    if (user.role === "student") return [{ id: user.id, name: user.name }];
    if (user.role === "guardian" && overview.data && "children" in overview.data) return overview.data.children ?? [];
    if (user.role === "teacher") return teacherStudents.data?.map(item => ({ id: item.id, name: item.name })) ?? [];
    if (user.role === "admin") return members.data?.filter(item => item.role === "student").map(item => ({ id: item.id, name: item.name })) ?? [];
    return [];
  }, [members.data, overview.data, teacherStudents.data, user]);

  useEffect(() => {
    if (!studentId && students[0]) setStudentId(students[0].id);
  }, [studentId, students]);

  const report = trpc.reports.studentSummary.useQuery({ studentId: studentId ?? 0 }, { enabled: Boolean(studentId) });
  const records = report.data?.progress ?? [];
  const attendance = report.data?.attendance ?? [];
  const present = attendance.filter(item => item.status === "present").length;

  const firstError = overview.error ?? members.error ?? circles.error ?? teacherStudents.error ?? report.error;
  if (firstError) {
    return <AppFrame eyebrow="تقدم الطالب" title="تعذر تحميل التقدم" description="تحقق من اتصالك ثم أعد المحاولة."><QueryError message={firstError.message} onRetry={() => { overview.refetch(); members.refetch(); circles.refetch(); teacherStudents.refetch(); report.refetch(); }} /></AppFrame>;
  }

  return (
    <AppFrame eyebrow="تقدم الطالب" title="سجل الحفظ والمراجعة" description="تقارير مبسطة تظهر فقط للطالب نفسه، أو ولي أمره المرتبط، أو فريق المؤسسة المخول.">
      <section className="rounded-3xl border border-[#dfe8e1] bg-white p-5 shadow-[0_16px_40px_-34px_rgba(21,58,48,0.5)]">
        <div className="grid gap-4 md:grid-cols-2">
          {user?.role === "teacher" ? <label className="form-label">الحلقة<select value={activeCircleId ?? ""} onChange={event => { setCircleId(Number(event.target.value)); setStudentId(null); }} className="form-input">{circles.data?.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label> : null}
          <label className="form-label">الطالب<select value={studentId ?? ""} onChange={event => setStudentId(Number(event.target.value))} className="form-input"><option value="">اختر طالباً</option>{students.map(student => <option key={student.id} value={student.id}>{student.name ?? `طالب #${student.id}`}</option>)}</select></label>
        </div>
        {!students.length ? <p className="mt-4 rounded-xl bg-[#fff8ea] p-3 text-sm text-[#805d28]">لا يوجد طالب مرتبط بهذا الحساب بعد. يحتاج المدير إلى ربط الحساب بالدور والحلقة المناسبين.</p> : null}
      </section>
      {report.isLoading ? <div className="grid place-items-center rounded-3xl bg-white py-16"><Loader2 className="size-7 animate-spin text-[#276654]" /></div> : studentId ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><StatCard label="حضور هذا الأسبوع" value={`${present}/${attendance.length}`} icon={CalendarCheck2} /><StatCard label="سجلات متابعة" value={records.length} icon={BookMarked} tone="sand" /><StatCard label="نقاط مكتسبة" value={records.reduce((sum, item) => sum + item.pointsAwarded, 0)} icon={Award} tone="ink" /></div><section className="rounded-3xl border border-[#dfe8e1] bg-white p-6"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#ecf4ed] text-[#2b6d59]"><Sparkles className="size-5" /></span><div><h2 className="font-display text-xl font-semibold text-[#193a31]">آخر المتابعات</h2><p className="text-sm text-[#718078]">الحفظ والمراجعة ومستوى التجويد كما سجلها المعلم.</p></div></div><div className="mt-5 space-y-3">{records.length ? records.map(record => <article key={record.id} className="rounded-2xl border border-[#e7eee9] p-4"><div className="flex flex-col justify-between gap-2 sm:flex-row"><div><p className="font-semibold text-[#29483e]">{record.memorizationFrom || record.memorizationTo ? `الحفظ: ${record.memorizationFrom ?? ""} ${record.memorizationTo ? `— ${record.memorizationTo}` : ""}` : "متابعة تعلم"}</p><p className="mt-1 text-sm text-[#738179]">{record.revisionTo ? `المراجعة: ${record.revisionTo}` : "لا توجد مراجعة مسجلة"}{record.notes ? ` · ${record.notes}` : ""}</p></div><div className="text-left"><span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#2e6c58]">{record.tajweedGrade === "excellent" ? "ممتاز" : record.tajweedGrade === "very_good" ? "جيد جداً" : record.tajweedGrade === "good" ? "جيد" : "يحتاج دعماً"}</span><p className="mt-2 text-xs text-[#849088]">{new Date(record.recordedAt).toLocaleDateString("ar-SA")}</p></div></div></article>) : <div className="rounded-2xl bg-[#fafcfb] py-10 text-center text-sm text-[#77837c]">لا توجد سجلات متابعة لهذا الأسبوع بعد.</div>}</div></section></> : <div className="rounded-3xl border border-dashed border-[#c9d9ce] bg-[#fbfdfb] py-16 text-center text-sm text-[#77837c]">اختر طالباً لعرض التقدم.</div>}
    </AppFrame>
  );
}
