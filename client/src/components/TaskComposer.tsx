import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CircleDollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TaskComposer({ circles, isAuthenticated }: { circles: Array<{ id: number; name: string }>; isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const [circleId, setCircleId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [pointsAvailable, setPointsAvailable] = useState("10");
  const studentsQuery = trpc.platform.circles.students.useQuery({ circleId: Number(circleId) || 0 }, { enabled: isAuthenticated && Boolean(circleId) });
  const createTask = trpc.platform.tasks.create.useMutation({ onSuccess: () => { utils.platform.dashboard.invalidate(); utils.platform.tasks.list.invalidate(); utils.platform.notifications.list.invalidate(); toast.success("تم إسناد المهمة وإشعار الطالب المرتبط."); setTitle(""); setStudentId(""); }, onError: error => toast.error(error.message) });
  if (!isAuthenticated) return null;
  return <section className="soft-card rounded-[1.6rem] border border-[#dce6dc] bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-kufi text-sm font-bold">إسناد مهمة للطالب</h2><p className="mt-1.5 text-xs text-[#7c877f]">تُنشأ مهمة حفظ أو مراجعة مرتبطة بالحلقة والطالب مع إشعار مباشر.</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff2d8] text-[#b8872b]"><CircleDollarSign className="h-4 w-4" /></span></div><form onSubmit={event => { event.preventDefault(); if (!circleId || !studentId) { toast.error("اختر الحلقة والطالب أولاً."); return; } createTask.mutate({ circleId: Number(circleId), studentId: Number(studentId), title, taskType: "memorization", pointsAvailable: Number(pointsAvailable) || 0 }); }} className="mt-5 grid gap-3 md:grid-cols-2"><select value={circleId} onChange={event => { setCircleId(event.target.value); setStudentId(""); }} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="">اختر الحلقة</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select><select value={studentId} onChange={event => setStudentId(event.target.value)} disabled={!circleId} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none disabled:opacity-50"><option value="">اختر الطالب</option>{studentsQuery.data?.map(student => <option key={student.id} value={student.id}>{student.name || `طالب #${student.id}`}</option>)}</select><input required value={title} onChange={event => setTitle(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" placeholder="عنوان المهمة" /><input value={pointsAvailable} onChange={event => setPointsAvailable(event.target.value)} type="number" min="0" max="1000" className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" aria-label="نقاط المهمة" /><Button disabled={createTask.isPending} type="submit" className="h-11 rounded-xl bg-[#174238] text-xs font-bold hover:bg-[#21594f] md:col-span-2">{createTask.isPending ? "جارٍ الإسناد…" : "إسناد المهمة"}</Button></form></section>;
}
