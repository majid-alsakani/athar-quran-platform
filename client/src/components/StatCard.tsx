import { LucideIcon } from "lucide-react";

export default function StatCard({ label, value, icon: Icon, tone = "sage" }: { label: string; value: string | number; icon: LucideIcon; tone?: "sage" | "sand" | "ink" }) {
  const tones = {
    sage: "bg-[#e9f0e7] text-[#2d6759]",
    sand: "bg-[#faf0d9] text-[#9c6a1e]",
    ink: "bg-[#e8edeb] text-[#193a31]",
  };
  return (
    <article className="rounded-2xl border border-[#dfe8e1] bg-white p-5 shadow-[0_12px_30px_-26px_rgba(20,58,48,0.5)]">
      <div className="flex items-start justify-between">
        <span className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></span>
        <span className="text-3xl font-semibold tracking-tight text-[#193a31]">{value}</span>
      </div>
      <p className="mt-5 text-sm font-medium text-[#68736d]">{label}</p>
    </article>
  );
}
