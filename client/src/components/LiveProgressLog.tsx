import { trpc } from "@/lib/trpc";
import { BookOpenCheck } from "lucide-react";

function formattedDate(date: Date | string | null | undefined) {
  if (!date) return "الآن";
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(new Date(date));
}

export default function LiveProgressLog({ isAuthenticated }: { isAuthenticated: boolean }) {
  const progressQuery = trpc.platform.progress.list.useQuery(undefined, { enabled: isAuthenticated });
  if (!isAuthenticated) return null;
  return <section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-kufi text-sm font-bold">سجل المتابعة الفعلي</h2><p className="mt-1 text-xs text-[#7c877f]">آخر تحديثات الحفظ والمراجعة المسجلة.</p></div><BookOpenCheck className="h-5 w-5 text-[#397c6b]" /></div><div className="mt-5 space-y-3">{progressQuery.data?.map(record => <div key={record.id} className="flex items-center gap-3 rounded-xl bg-[#f7f8f2] p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#397c6b]"><BookOpenCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{record.studentName || "طالب"}{record.memorizationTo ? ` · ${record.memorizationTo}` : " · متابعة حفظ"}</p><p className="mt-1 text-[10px] text-[#7b867e]">{formattedDate(record.recordedAt)}{record.revisionTo ? ` · مراجعة ${record.revisionTo}` : ""}</p></div>{record.pointsAwarded > 0 && <span className="text-xs font-bold text-[#b8872b]">+{record.pointsAwarded}</span>}</div>)}{progressQuery.data?.length === 0 && <div className="rounded-xl border border-dashed border-[#ddd8c9] px-4 py-6 text-center text-xs text-[#8a958c]">لا توجد سجلات فعلية بعد. أضف متابعة من النموذج أعلاه.</div>}</div></section>;
}
