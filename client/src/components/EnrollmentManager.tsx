import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function EnrollmentManager({ circles, isAuthenticated }: { circles: Array<{ id: number; name: string }>; isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const [circleId, setCircleId] = useState("");
  const [studentId, setStudentId] = useState("");
  const usersQuery = trpc.platform.users.list.useQuery(undefined, { enabled: isAuthenticated });
  const enroll = trpc.platform.circles.enroll.useMutation({ onSuccess: () => { utils.platform.dashboard.invalidate(); utils.platform.circles.list.invalidate(); setStudentId(""); toast.success("تم تسجيل الطالب في الحلقة."); }, onError: error => toast.error(error.message) });
  const students = usersQuery.data?.filter(user => user.role === "student") || [];
  if (!isAuthenticated) return null;
  return <section className="soft-card rounded-[1.6rem] border border-[#dce6dc] bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-kufi text-sm font-bold">تسجيل طالب في حلقة</h2><p className="mt-1.5 text-xs text-[#7c877f]">اختر طالباً مفعلاً من الحسابات ثم أضفه إلى الحلقة المناسبة.</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f3ea] text-[#397c6b]"><UserRoundCheck className="h-4 w-4" /></span></div><form onSubmit={event => { event.preventDefault(); if (!circleId || !studentId) { toast.error("اختر الحلقة والطالب أولاً."); return; } enroll.mutate({ circleId: Number(circleId), studentId: Number(studentId) }); }} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><select value={circleId} onChange={event => setCircleId(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="">اختر الحلقة</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select><select value={studentId} onChange={event => setStudentId(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="">اختر الطالب</option>{students.map(student => <option key={student.id} value={student.id}>{student.name || student.email || `طالب #${student.id}`}</option>)}</select><Button disabled={enroll.isPending} type="submit" className="h-11 rounded-xl bg-[#174238] px-5 text-xs font-bold hover:bg-[#21594f]">{enroll.isPending ? "جارٍ التسجيل…" : "تسجيل الطالب"}</Button></form>{students.length === 0 && <p className="mt-3 text-[11px] text-[#a06f26]">لا توجد حسابات بدور طالب بعد؛ حدّد الدور من إدارة الحسابات أولاً.</p>}</section>;
}
