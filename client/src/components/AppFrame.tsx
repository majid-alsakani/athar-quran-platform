import DashboardLayout from "@/components/DashboardLayout";
import { ReactNode } from "react";

export default function AppFrame({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DashboardLayout>
      <section className="mx-auto w-full max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-5 border-b border-[#dde7df] pb-6 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[#82714f]">{eyebrow}</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-[#193a31] sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#68736d]">{description}</p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
        {children}
      </section>
    </DashboardLayout>
  );
}
