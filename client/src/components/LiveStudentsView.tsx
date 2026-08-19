import { trpc } from "@/lib/trpc";
import { GraduationCap } from "lucide-react";

export default function LiveStudentsView({ isAuthenticated, title }: { isAuthenticated: boolean; title: string }) {
  const studentsQuery = trpc.platform.students.list.useQuery(undefined, { enabled: isAuthenticated });
  if (!isAuthenticated) return null;
  return <section className="soft-card overflow-hidden rounded-[1.6rem] border border-[#e6e1d2] bg-white"><div className="flex items-start justify-between p-5 sm:p-6"><div><h2 className="font-kufi text-sm font-bold">{title}</h2><p className="mt-1.5 text-xs text-[#7c877f]">قائمة حية بالحسابات المرتبطة بصلاحياتك الحالية.</p></div><GraduationCap className="h-5 w-5 text-[#397c6b]" /></div><div className="divide-y divide-[#efebdf]">{studentsQuery.data?.map(student => <div key={student.id} className="flex items-center gap-3 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#eaf3ea] text-xs font-bold text-[#397c6b]">{(student.name || "ط").charAt(0)}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{student.name || "طالب"}</p><p className="mt-1 text-[10px] text-[#819087]">{student.email || "حساب طالب في المنصة"}</p></div><span className="rounded-full bg-[#eef7ef] px-2.5 py-1 text-[10px] font-bold text-[#397c6b]">نشط</span></div>)}{studentsQuery.data?.length === 0 && <div className="px-5 py-10 text-center text-xs text-[#8a958c]">لا توجد حسابات طلاب مرتبطة بدورك بعد.</div>}</div></section>;
}
