import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleDollarSign, ClipboardList } from "lucide-react";

function formattedDate(date: Date | string | null | undefined) { return date ? new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(new Date(date)) : "دون تاريخ"; }
const taskLabels = { memorization: "حفظ", revision: "مراجعة", practice: "تدريب", challenge: "تحدٍّ" } as const;

export default function LiveTasksView({ isAuthenticated }: { isAuthenticated: boolean }) {
  const tasksQuery = trpc.platform.tasks.list.useQuery(undefined, { enabled: isAuthenticated });
  if (!isAuthenticated) return null;
  return <section className="soft-card overflow-hidden rounded-[1.6rem] border border-[#e6e1d2] bg-white"><div className="flex items-start justify-between p-5 sm:p-6"><div><h2 className="font-kufi text-sm font-bold">المهام الفعلية</h2><p className="mt-1.5 text-xs text-[#7c877f]">مهام الطلاب التي تندرج ضمن صلاحيات حسابك الحالي.</p></div><ClipboardList className="h-5 w-5 text-[#397c6b]" /></div><div className="divide-y divide-[#efebdf]">{tasksQuery.data?.map(task => <article key={task.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff3d9] text-[#b88729]"><CheckCircle2 className="h-4.5 w-4.5" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{task.title}</h3><p className="mt-1 text-xs text-[#77847c]">{task.circleName} · {task.studentName || "مهمة الحلقة"}</p></div><div className="flex items-center gap-2 text-[11px] font-bold"><span className="rounded-full bg-[#edf5ed] px-2.5 py-1.5 text-[#397c6b]">{taskLabels[task.taskType]}</span><span className="rounded-full bg-[#f5f4ed] px-2.5 py-1.5 text-[#758178]">{formattedDate(task.dueAt)}</span><span className="inline-flex items-center gap-1 text-[#b88729]"><CircleDollarSign className="h-3.5 w-3.5" />+{task.pointsAvailable}</span></div></article>)}{tasksQuery.data?.length === 0 && <div className="px-5 py-12 text-center text-xs text-[#8a958c]">لا توجد مهام مرتبطة بحسابك حالياً.</div>}</div></section>;
}
