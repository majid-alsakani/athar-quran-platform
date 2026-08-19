import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type CircleSummary = { id: number; name: string; meetingSummary: string; capacity: number; status: "active" | "paused" | "archived"; teacherId: number };

export default function CircleManagementPanel({ circles, isAuthenticated, isAdmin }: { circles: CircleSummary[]; isAuthenticated: boolean; isAdmin: boolean }) {
  const utils = trpc.useUtils();
  const [circleId, setCircleId] = useState("");
  const [name, setName] = useState("");
  const [meetingSummary, setMeetingSummary] = useState("");
  const [capacity, setCapacity] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [status, setStatus] = useState<CircleSummary["status"]>("active");
  const updateCircle = trpc.platform.circles.update.useMutation({ onSuccess: () => { utils.platform.circles.list.invalidate(); utils.platform.dashboard.invalidate(); toast.success("تم تحديث بيانات الحلقة."); }, onError: error => toast.error(error.message) });
  const teachersQuery = trpc.platform.teachers.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  if (!isAuthenticated || !circles.length) return null;
  const chooseCircle = (id: string) => { setCircleId(id); const selected = circles.find(circle => circle.id === Number(id)); if (selected) { setName(selected.name); setMeetingSummary(selected.meetingSummary); setCapacity(String(selected.capacity)); setStatus(selected.status); setTeacherId(String(selected.teacherId)); } };
  return <section id="circle-manager" className="soft-card rounded-[1.6rem] border border-[#dce6dc] bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="font-kufi text-sm font-bold">إدارة حلقة قائمة</h2><p className="mt-1.5 text-xs text-[#7c877f]">حدّث اسم الحلقة أو موعدها أو سعتها وحالتها التشغيلية.</p></div><Settings2 className="h-5 w-5 text-[#397c6b]" /></div><form onSubmit={event => { event.preventDefault(); if (!circleId) { toast.error("اختر الحلقة أولاً."); return; } updateCircle.mutate({ circleId: Number(circleId), name, meetingSummary, capacity: Number(capacity), status, ...(isAdmin && teacherId ? { teacherId: Number(teacherId) } : {}) }); }} className="mt-5 grid gap-3 md:grid-cols-2"><select value={circleId} onChange={event => chooseCircle(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="">اختر الحلقة لإدارتها</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select><select value={status} onChange={event => setStatus(event.target.value as CircleSummary["status"])} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="active">نشطة</option><option value="paused">متوقفة مؤقتاً</option><option value="archived">مؤرشفة</option></select><input value={name} onChange={event => setName(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" placeholder="اسم الحلقة" /><input value={meetingSummary} onChange={event => setMeetingSummary(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" placeholder="ملخص الموعد" />{isAdmin && <select value={teacherId} onChange={event => setTeacherId(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="">اختر المعلم</option>{teachersQuery.data?.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.email || `معلّم #${teacher.id}`}</option>)}</select>}<input value={capacity} onChange={event => setCapacity(event.target.value)} type="number" min="1" max="300" className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" placeholder="السعة" /><Button disabled={updateCircle.isPending} type="submit" className="h-11 rounded-xl bg-[#174238] text-xs font-bold hover:bg-[#21594f]">{updateCircle.isPending ? "جارٍ التحديث…" : "حفظ التعديلات"}</Button></form></section>;
}
