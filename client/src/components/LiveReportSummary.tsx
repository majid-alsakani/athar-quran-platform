import { trpc } from "@/lib/trpc";
import { FileBarChart } from "lucide-react";

export default function LiveReportSummary({ isAuthenticated }: { isAuthenticated: boolean }) {
  const dashboardQuery = trpc.platform.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const progressQuery = trpc.platform.progress.list.useQuery(undefined, { enabled: isAuthenticated });
  const pointsQuery = trpc.platform.points.list.useQuery(undefined, { enabled: isAuthenticated });
  if (!isAuthenticated) return null;
  const metrics = dashboardQuery.data?.metrics;
  const progress = progressQuery.data || [];
  const points = pointsQuery.data || [];
  return <section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="font-kufi text-sm font-bold">ملخص الأداء الفعلي</h2><p className="mt-1.5 text-xs text-[#7c877f]">يعتمد على البيانات المسجلة في المنصة للحساب الحالي ودوره.</p></div><FileBarChart className="h-5 w-5 text-[#397c6b]" /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#f5f8f2] p-4"><p className="text-[11px] font-bold text-[#748077]">الحلقات المتاحة</p><p className="mt-2 font-kufi text-xl font-bold text-[#397c6b]">{metrics?.circles || 0}</p></div><div className="rounded-xl bg-[#fff8e8] p-4"><p className="text-[11px] font-bold text-[#8a774a]">سجلات المتابعة</p><p className="mt-2 font-kufi text-xl font-bold text-[#b8872b]">{progress.length}</p></div><div className="rounded-xl bg-[#eef5f7] p-4"><p className="text-[11px] font-bold text-[#66808b]">النقاط المسجلة</p><p className="mt-2 font-kufi text-xl font-bold text-[#4c8192]">{points.reduce((total, item) => total + item.points, 0)}</p></div></div></section>;
}
