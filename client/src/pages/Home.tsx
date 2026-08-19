import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, BookOpenCheck, Building2, CalendarDays, ChevronLeft, HeartHandshake, Play, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

const pillars = [
  { icon: Building2, title: "إدارة واضحة للحلقات", copy: "من تأسيس الحلقة وجدولتها إلى رصد الحضور والإنجاز، في مساحة واحدة منظمة." },
  { icon: HeartHandshake, title: "صلة مطمئنة مع الأسرة", copy: "تصل المستجدات المهمة لولي الأمر داخل المنصة، فيتابع ابنه دون انتظار التقارير الورقية." },
  { icon: Sparkles, title: "رحلة تحفيزية للطالب", copy: "نقاط ومهام وسجل تقدّم يمنح الطالب رؤية هادئة ومحفزة لرحلته القرآنية." },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const enterPlatform = () => {
    if (isAuthenticated) setLocation("/dashboard");
    else startLogin();
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf5] text-[#153f38]">
      <section className="relative isolate overflow-hidden bg-[#0d4139] text-white">
        <div className="islamic-grid absolute inset-0 opacity-55" />
        <div className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-[#d1ad58]/20 blur-3xl" />
        <div className="absolute -bottom-40 left-[12%] h-96 w-96 rounded-full bg-[#4f9282]/25 blur-3xl" />
        <header className="container relative z-10 flex items-center justify-between py-5">
          <button onClick={() => setLocation("/")} className="group flex items-center gap-3 text-right" aria-label="العودة للرئيسية">
            <Logo inverse />
            <span className="hidden border-r border-white/20 pr-3 text-xs font-medium text-white/70 sm:block">منصة الحلقات القرآنية</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setLocation("/dashboard")} className="hidden text-sm text-white/75 transition hover:text-white sm:block">استعراض المنصة</button>
            <Button onClick={enterPlatform} className="h-10 rounded-xl bg-[#efd289] px-5 text-sm font-bold text-[#173f38] shadow-lg shadow-black/10 transition hover:bg-[#ffe2a0] active:scale-[.97]">
              {isAuthenticated ? "دخول المنصة" : "تسجيل الدخول"}
            </Button>
          </div>
        </header>

        <div className="container relative z-10 grid gap-12 pb-20 pt-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pb-28 lg:pt-20">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#efd289]/25 bg-white/10 px-4 py-2 text-xs font-bold text-[#ffe1a0] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffe1a0]" />
              أثر يربط الحلقة والأسرة والطالب في مسار واحد
            </div>
            <h1 className="font-kufi text-3xl font-bold leading-[1.75] tracking-[-.04em] text-white sm:text-4xl lg:text-[2.7rem]">
              لكل آية أثر،<br />ولكل إنجاز مساحة تُرى وتُحتفى.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">
              منصة عربية متكاملة تمنح الحلقات القرآنية إدارة أكثر سلاسة، وتمنح الأسرة متابعة أقرب، وتمنح الطالب رحلة حفظ ومراجعة واضحة ومُلهمة.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button onClick={() => setLocation("/dashboard")} size="lg" className="h-13 rounded-2xl bg-[#efd289] px-6 text-base font-bold text-[#173f38] hover:bg-[#ffe3a4] active:scale-[.97]">
                استكشف الواجهات <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
              <button onClick={() => setLocation("/dashboard")} className="inline-flex h-13 items-center gap-2 rounded-2xl px-4 text-sm font-bold text-white transition hover:bg-white/10">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25"><Play className="h-3.5 w-3.5 fill-current" /></span>
                معاينة تجربة المنصة
              </button>
            </div>
            <div className="mt-12 grid max-w-lg grid-cols-3 border-t border-white/15 pt-7 text-right">
              {[['٤ أدوار', 'بتجارب مخصصة'], ['٢٤/٧', 'متابعة داخلية'], ['RTL', 'عربية أصيلة']].map(([number, label]) => (
                <div key={number} className="border-l border-white/15 pl-4 last:border-0 last:pl-0">
                  <p className="font-kufi text-base font-bold text-[#ffe3a4]">{number}</p>
                  <p className="mt-1 text-xs text-white/60">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[500px] lg:mr-auto lg:ml-0">
            <div className="absolute inset-8 rounded-[2.4rem] border border-[#efd289]/20 bg-[#0d4139] shadow-[0_0_0_16px_rgba(239,210,137,.06)]" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#f9f7ed] p-4 text-[#173f38] shadow-2xl shadow-black/30 sm:p-5">
              <div className="flex items-center justify-between border-b border-[#e7e2d2] pb-4">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#d2a94f]" /><span className="h-2.5 w-2.5 rounded-full bg-[#6ba793]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e5e0d1]" /></div>
                <span className="text-xs font-bold text-[#6c756b]">لوحة المعلّم</span>
              </div>
              <div className="mt-5 rounded-2xl bg-[#0d4139] p-5 text-white">
                <div className="flex items-start justify-between"><div><p className="text-xs text-white/60">حلقة الفجر</p><p className="mt-1 font-kufi text-sm font-bold">أهلاً بك يا معلّم</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#efd289] text-[#173f38]"><BookOpenCheck className="h-5 w-5" /></div></div>
                <div className="mt-5 flex items-end gap-1.5" dir="ltr">{[32, 48, 40, 70, 58, 83, 72].map((height, i) => <span key={i} className="flex-1 rounded-t-md bg-[#efd289]/80" style={{ height }} />)}</div>
                <div className="mt-3 flex justify-between text-[10px] text-white/55"><span>الأسبوع الماضي</span><span>+١٨٪ متابعة</span></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#e7e2d2] p-4"><UsersRound className="h-4 w-4 text-[#3f8878]" /><p className="mt-3 text-2xl font-black">٢٤</p><p className="text-xs text-[#788177]">طالباً نشطاً</p></div>
                <div className="rounded-2xl border border-[#e7e2d2] p-4"><CalendarDays className="h-4 w-4 text-[#bc9131]" /><p className="mt-3 text-2xl font-black">٩٢٪</p><p className="text-xs text-[#788177]">حضور الأسبوع</p></div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#edf5ee] p-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#dcecd6] text-[#3c856f]"><ShieldCheck className="h-4 w-4" /></div><div><p className="text-xs font-bold">تقارير الأسرة محدثة</p><p className="mt-0.5 text-[10px] text-[#778077]">آخر مزامنة قبل دقائق</p></div></div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#fbfaf5] [clip-path:polygon(0_70%,100%_0,100%_100%,0_100%)]" />
      </section>

      <section className="container py-20 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div><p className="font-kufi text-xs font-bold text-[#b98726]">منظومة واحدة، أثر متصل</p><h2 className="mt-4 font-kufi text-2xl font-bold leading-[1.8] tracking-[-.035em] sm:text-3xl">تجربة مصممة بهدوء، لتبقى العناية على ما يهم.</h2></div>
          <p className="max-w-2xl text-base leading-8 text-[#65756c]">بدلاً من توزيع الجهد بين الدفاتر والمحادثات والتقارير المتأخرة، تنظم «أثر» تفاصيل العمل اليومي في واجهات عربية دقيقة تحفظ للمعلم وقته وللأسرة طمأنينتها.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar, index) => <div key={pillar.title} className="soft-card relative overflow-hidden rounded-[1.6rem] border border-[#e8e4d4] bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl"><span className="absolute left-0 top-0 h-1 w-20 bg-[#d5af57]" /><span className="font-kufi text-xs text-[#b98b2d]">0{index + 1}</span><div className="mt-7 grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf3ea] text-[#317a6a]"><pillar.icon className="h-5 w-5" /></div><h3 className="mt-6 font-kufi text-sm font-bold">{pillar.title}</h3><p className="mt-3 text-sm leading-7 text-[#708077]">{pillar.copy}</p></div>)}
        </div>
      </section>
    </main>
  );
}

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <div className="flex items-center gap-2.5"><span className={`relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl ${inverse ? "bg-[#efd289] text-[#174238]" : "bg-[#174238] text-[#efd289]"}`}><span className="absolute inset-1 rounded-lg border border-current/50 [clip-path:polygon(50%_0,62%_34%,100%_50%,62%_66%,50%_100%,38%_66%,0_50%,38%_34%)]" /><span className="relative font-kufi text-sm font-bold">أ</span></span><span className={`font-kufi text-base font-bold tracking-[-.06em] ${inverse ? "text-white" : "text-[#174238]"}`}>أثر</span></div>;
}
