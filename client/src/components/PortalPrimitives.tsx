import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

function number(value: number) { return new Intl.NumberFormat("ar-SA").format(value); }

export function MetricCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: LucideIcon; color: string }) {
  const palette: Record<string, string> = { green: "bg-[#e8f4ed] text-[#397c6a]", gold: "bg-[#fff2d8] text-[#b8872b]", blue: "bg-[#eaf2f5] text-[#4c8091]", rose: "bg-[#fceceb] text-[#bb6b65]" };
  return <article className="soft-card group rounded-[1.35rem] border border-[#e6e1d2] bg-white p-4 transition hover:-translate-y-0.5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-[#77847c]">{label}</p><p className="mt-3 font-kufi text-xl font-bold text-[#174238]">{number(value)}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${palette[color]}`}><Icon className="h-4.5 w-4.5" /></span></div><div className="mt-4 h-1 overflow-hidden rounded-full bg-[#edf0e9]"><span className="block h-full w-2/3 rounded-full bg-[#3d8674]" /></div></article>;
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) {
  return <div className="flex items-start justify-between gap-4"><div><h2 className="font-kufi text-sm font-bold text-[#174238]">{title}</h2><p className="mt-1.5 text-xs text-[#7a867e]">{subtitle}</p></div>{action && <button onClick={() => toast.info("تتوفر التفاصيل الكاملة بعد إضافة بياناتك في المنصة.")} className="whitespace-nowrap text-xs font-bold text-[#397c6b] transition hover:text-[#174238]">{action}</button>}</div>;
}

export function ProgressRing({ value, label }: { value: number; label: string }) {
  return <div className="mx-auto grid h-36 w-36 place-items-center rounded-full ring-track p-3" style={{ "--ring-color": "#3f8878", "--ring-value": `${value}%` } as React.CSSProperties}><div className="grid h-full w-full place-items-center rounded-full bg-white text-center"><span className="font-kufi text-lg font-bold">{number(value)}٪</span><span className="mt-1 text-[10px] text-[#7e897f]">{label}</span></div></div>;
}

export function EmptyState({ label }: { label: string }) { return <div className="rounded-xl border border-dashed border-[#ddd8c9] px-4 py-6 text-center text-xs text-[#8a958c]">{label}</div>; }
