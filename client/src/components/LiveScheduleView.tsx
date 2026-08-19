import { trpc } from "@/lib/trpc";
import { CalendarDays, Clock3, MapPin } from "lucide-react";

function formattedDate(date: Date | string | null | undefined) {
  if (!date) return "قريباً";
  return new Intl.DateTimeFormat("ar-SA", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

export default function LiveScheduleView({ isAuthenticated }: { isAuthenticated: boolean }) {
  const sessionsQuery = trpc.platform.sessions.list.useQuery(undefined, { enabled: isAuthenticated });
  if (!isAuthenticated) return null;
  return <section className="soft-card overflow-hidden rounded-[1.6rem] border border-[#e6e1d2] bg-white"><div className="flex items-start justify-between p-5 sm:p-6"><div><h2 className="font-kufi text-sm font-bold">الجدول الفعلي</h2><p className="mt-1.5 text-xs text-[#7c877f]">جلسات الحلقات المتاحة وفق حسابك وعلاقاتك المصرح بها.</p></div><CalendarDays className="h-5 w-5 text-[#397c6b]" /></div><div className="divide-y divide-[#efebdf]">{sessionsQuery.data?.map(session => <article key={session.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf3ea] text-[#397c6b]"><CalendarDays className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{session.title}</h3><p className="mt-1 text-xs text-[#748078]">{session.circleName}</p></div><div className="flex flex-wrap gap-2 text-[11px] font-bold text-[#668076]"><span className="inline-flex items-center gap-1 rounded-full bg-[#f3f6ee] px-2.5 py-1.5"><Clock3 className="h-3.5 w-3.5" />{formattedDate(session.startsAt)}</span><span className="inline-flex items-center gap-1 rounded-full bg-[#fff6e4] px-2.5 py-1.5 text-[#9f7727]"><MapPin className="h-3.5 w-3.5" />{session.status === "completed" ? "مكتملة" : session.status === "cancelled" ? "ملغاة" : "مجدولة"}</span></div></article>)}{sessionsQuery.data?.length === 0 && <div className="px-5 py-12 text-center text-xs text-[#8a958c]">لا توجد جلسات متاحة في جدولك حالياً.</div>}</div></section>;
}
