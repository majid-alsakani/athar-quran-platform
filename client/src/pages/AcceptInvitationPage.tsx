import { useAuth } from "@/_core/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, LockKeyhole, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { useRoute } from "wouter";

export default function AcceptInvitationPage() {
  const [, params] = useRoute("/invite/:token");
  const token = params?.token ?? "";
  const { user, loading } = useAuth();
  const preview = trpc.organization.previewInvitation.useQuery({ token }, { enabled: token.length >= 16, retry: false });
  const accept = trpc.organization.acceptInvitation.useMutation();
  const channelIcon = preview.data?.valid && preview.data.channel === "whatsapp" ? <MessageCircle className="size-5" /> : <Mail className="size-5" />;

  const body = () => {
    if (preview.isLoading || loading) return <div className="grid place-items-center py-16"><Loader2 className="size-7 animate-spin text-[#276654]" /></div>;
    if (!preview.data?.valid) return <div className="py-7 text-center"><LockKeyhole className="mx-auto size-10 text-[#a26732]" /><h1 className="mt-5 font-display text-3xl font-semibold text-[#193a31]">الدعوة غير متاحة</h1><p className="mx-auto mt-3 max-w-md leading-8 text-[#718078]">قد تكون الدعوة منتهية أو مستخدمة أو أُلغيَت. اطلب من إدارة المؤسسة إرسال دعوة جديدة عند الحاجة.</p></div>;
    if (!user) return <div className="py-7 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eaf2eb] text-[#276654]">{channelIcon}</span><h1 className="mt-5 font-display text-3xl font-semibold text-[#193a31]">دعوة متابعة ولي أمر</h1><p className="mx-auto mt-3 max-w-md leading-8 text-[#718078]">سجّل دخولك أولاً لتأكيد هويتك، ثم وافق صراحةً على استقبال التقارير الأسبوعية عبر القناة التي اختارتها إدارة المؤسسة.</p><Button onClick={() => startLogin()} className="mt-7 h-11 rounded-xl bg-[#276654] px-6 text-white hover:bg-[#1e5545]"><ShieldCheck className="size-4" />تسجيل الدخول للمتابعة</Button></div>;
    if (accept.isSuccess) return <div className="py-7 text-center"><CheckCircle2 className="mx-auto size-12 text-[#276654]" /><h1 className="mt-5 font-display text-3xl font-semibold text-[#193a31]">تم تفعيل المتابعة</h1><p className="mx-auto mt-3 max-w-md leading-8 text-[#718078]">رُبط حسابك بمتابعة الطالب ضمن هذه المؤسسة، وسُجلت موافقتك على التقارير الأسبوعية. لن يتم إرسال رسالة خارجية قبل اعتماد مزود القناة من إدارة المؤسسة.</p><Button asChild className="mt-7 h-11 rounded-xl bg-[#276654] text-white hover:bg-[#1e5545]"><a href="/app/progress">عرض التقدم</a></Button></div>;
    return <div className="py-7 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eaf2eb] text-[#276654]">{channelIcon}</span><h1 className="mt-5 font-display text-3xl font-semibold text-[#193a31]">تأكيد متابعة الطالب</h1><p className="mx-auto mt-3 max-w-md leading-8 text-[#718078]">أنت على وشك تفعيل وصول مقيد بتقارير الطالب المرتبط بهذه الدعوة فقط، مع الموافقة على التقارير الأسبوعية.</p><Button onClick={() => accept.mutate({ token, consentToWeeklyReports: true })} disabled={accept.isPending} className="mt-7 h-11 rounded-xl bg-[#276654] px-6 text-white hover:bg-[#1e5545]">{accept.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}أوافق وأفعّل المتابعة</Button>{accept.error ? <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-red-700">{accept.error.message}</p> : null}</div>;
  };

  return <main dir="rtl" className="relative isolate box-border block min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-[#f7faf7] px-4 py-8 text-[#193a31] sm:py-14"><header className="mx-auto flex box-border w-full max-w-4xl min-w-0 items-center justify-between"><a href="/" className="font-display text-xl font-semibold">أثر <span className="text-[#276654]">للحلقات</span></a><ThemeToggle /></header><section className="mx-auto mt-10 box-border w-full min-w-0 max-w-2xl rounded-[2rem] border border-[#dfe8e1] bg-white p-7 shadow-[0_22px_60px_-44px_rgba(21,58,48,0.55)] sm:p-10">{body()}<p className="mt-6 border-t border-[#edf1ee] pt-5 text-center text-xs leading-6 text-[#819087]">لأمان الخصوصية، لا تظهر هذه الصفحة اسم الطالب أو بياناته قبل تحقق الدعوة وتسجيل الدخول.</p></section></main>;
}
