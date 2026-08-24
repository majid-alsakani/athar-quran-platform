import AppFrame from "@/components/AppFrame";
import QueryError from "@/components/QueryError";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const list = trpc.notifications.mine.useQuery(undefined, { enabled: Boolean(user) });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => { utils.notifications.mine.invalidate(); utils.dashboard.overview.invalidate(); } });
  if (list.error) return <AppFrame eyebrow="التنبيهات" title="تعذر تحميل الإشعارات" description="تحقق من اتصالك ثم أعد المحاولة."><QueryError message={list.error.message} onRetry={() => list.refetch()} /></AppFrame>;
  return <AppFrame eyebrow="التنبيهات" title="إشعارات المنصة" description="تصل التنبيهات داخل المنصة عند حفظ حضور أو سجل تقدم أو تقرير أسبوعي جديد."><section className="rounded-3xl border border-[#dfe8e1] bg-white p-6 shadow-[0_16px_40px_-34px_rgba(21,58,48,0.5)]">{list.isLoading ? <div className="grid place-items-center py-16"><Loader2 className="size-7 animate-spin text-[#276654]" /></div> : list.data?.length ? <div className="space-y-3">{list.data.map(note => <article key={note.id} className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${note.isRead ? "border-[#edf1ed] bg-white" : "border-[#d5e9dc] bg-[#f7fcf8]"}`}><div className="flex gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${note.isRead ? "bg-[#f0f3f0] text-[#718078]" : "bg-[#e3f1e6] text-[#2f6d58]"}`}><Bell className="size-5" /></span><div><p className="font-semibold text-[#29483e]">{note.title}</p><p className="mt-1 text-sm leading-6 text-[#718078]">{note.body}</p><p className="mt-1 text-xs text-[#93a099]">{new Date(note.createdAt).toLocaleString("ar-SA")}</p></div></div>{!note.isRead ? <button disabled={markRead.isPending} onClick={() => markRead.mutate({ id: note.id })} className="inline-flex items-center gap-2 self-end rounded-xl bg-[#edf5ef] px-3 py-2 text-xs font-semibold text-[#2c6a56] transition hover:bg-[#dfeee3] sm:self-auto"><CheckCheck className="size-4" />تمت القراءة</button> : null}</article>)}</div> : <div className="py-16 text-center"><Bell className="mx-auto size-9 text-[#8aaa9b]" /><h2 className="mt-4 font-display text-xl font-semibold text-[#264439]">لا توجد إشعارات بعد</h2><p className="mt-2 text-sm text-[#77837c]">ستظهر هنا تحديثات الحضور والتقدم والتقارير عند بدء استخدام المنصة.</p></div>}</section></AppFrame>;
}
