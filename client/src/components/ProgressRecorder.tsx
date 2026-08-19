import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BookOpenCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ProgressRecorder({ circles, isAuthenticated }: { circles: Array<{ id: number; name: string }>; isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const [circleId, setCircleId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [memorizationTo, setMemorizationTo] = useState("");
  const [revisionTo, setRevisionTo] = useState("");
  const [tajweedGrade, setTajweedGrade] = useState<"excellent" | "very_good" | "good" | "needs_support">("very_good");
  const [notes, setNotes] = useState("");
  const studentsQuery = trpc.platform.circles.students.useQuery({ circleId: Number(circleId) || 0 }, { enabled: isAuthenticated && Boolean(circleId) });
  const recordProgress = trpc.platform.progress.record.useMutation({
    onSuccess: () => {
      utils.platform.dashboard.invalidate();
      utils.platform.notifications.list.invalidate();
      utils.platform.progress.list.invalidate();
      utils.platform.points.list.invalidate();
      setStudentId("");
      setMemorizationTo("");
      setRevisionTo("");
      toast.success("تم تسجيل الحفظ والنقاط وإشعار ولي الأمر.");
    },
    onError: error => toast.error(error.message),
  });

  if (!isAuthenticated) return null;
  return <section className="soft-card rounded-[1.6rem] border border-[#dce6dc] bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-kufi text-sm font-bold">تسجيل متابعة جديدة</h2><p className="mt-1.5 text-xs text-[#7c877f]">يوثق الحفظ والمراجعة والتجويد ويحتسب النقاط تلقائياً وفق الأداء.</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f3ea] text-[#397c6b]"><BookOpenCheck className="h-4 w-4" /></span></div><form onSubmit={event => { event.preventDefault(); if (!circleId || !studentId) { toast.error("اختر الحلقة والطالب أولاً."); return; } recordProgress.mutate({ circleId: Number(circleId), studentId: Number(studentId), memorizationTo: memorizationTo || undefined, revisionTo: revisionTo || undefined, tajweedGrade, notes: notes || undefined }); }} className="mt-5 grid gap-3 md:grid-cols-2"><select value={circleId} onChange={event => { setCircleId(event.target.value); setStudentId(""); }} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="">اختر الحلقة</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select><select value={studentId} onChange={event => setStudentId(event.target.value)} disabled={!circleId} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none disabled:opacity-50"><option value="">اختر الطالب</option>{studentsQuery.data?.map(student => <option key={student.id} value={student.id}>{student.name || `طالب #${student.id}`}</option>)}</select><input value={memorizationTo} onChange={event => setMemorizationTo(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" placeholder="موضع الحفظ الجديد، مثال: الآية ١٢" /><input value={revisionTo} onChange={event => setRevisionTo(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" placeholder="موضع المراجعة" /><select value={tajweedGrade} onChange={event => setTajweedGrade(event.target.value as typeof tajweedGrade)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="excellent">تجويد: ممتاز</option><option value="very_good">تجويد: جيد جداً</option><option value="good">تجويد: جيد</option><option value="needs_support">تجويد: يحتاج دعماً</option></select><div className="flex items-center rounded-xl bg-[#fff8e8] px-3 text-xs font-bold text-[#9a7428]">تُحسب النقاط تلقائياً من عناصر المتابعة.</div><textarea value={notes} onChange={event => setNotes(event.target.value)} className="min-h-20 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 py-3 text-xs outline-none md:col-span-2" placeholder="ملاحظات المعلم اليومية (اختياري)" /><Button disabled={recordProgress.isPending} type="submit" className="h-11 rounded-xl bg-[#174238] text-xs font-bold hover:bg-[#21594f] md:col-span-2">{recordProgress.isPending ? "جارٍ الحفظ…" : "تسجيل المتابعة"}</Button></form></section>;
}
