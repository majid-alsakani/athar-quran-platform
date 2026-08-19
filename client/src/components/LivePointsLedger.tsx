import { trpc } from "@/lib/trpc";
import { Trophy } from "lucide-react";

export default function LivePointsLedger({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pointsQuery = trpc.platform.points.list.useQuery(undefined, { enabled: isAuthenticated });
  if (!isAuthenticated) return null;
  return <section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-kufi text-sm font-bold">سجل النقاط الفعلي</h2><p className="mt-1 text-xs text-[#7c877f]">كل نقطة مرتبطة بسبب وتاريخ واضحين.</p></div><Trophy className="h-5 w-5 text-[#b8872b]" /></div><div className="mt-5 space-y-3">{pointsQuery.data?.map(entry => <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-[#f7f8f2] p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#b8872b]"><Trophy className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{entry.studentName || "طالب"}</p><p className="mt-1 truncate text-[10px] text-[#7b867e]">{entry.description}</p></div><span className="font-kufi text-xs font-bold text-[#b8872b]">+{entry.points}</span></div>)}{pointsQuery.data?.length === 0 && <div className="rounded-xl border border-dashed border-[#ddd8c9] px-4 py-6 text-center text-xs text-[#8a958c]">لا توجد نقاط مسجلة بعد.</div>}</div></section>;
}
