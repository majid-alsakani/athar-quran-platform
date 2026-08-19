import { useAuth } from "@/_core/hooks/useAuth";
import { Logo } from "@/pages/Home";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { type AtharRole, roleLabels } from "@shared/athar";
import { Bell, BookMarked, BookOpenCheck, CalendarDays, ChevronLeft, CircleDollarSign, ClipboardCheck, Crown, FileBarChart, GraduationCap, LayoutDashboard, LogIn, Mail, Menu, MessageCircle, MoreHorizontal, Plus, Search, Settings2, Sparkles, Trophy, UserRoundCheck, UsersRound, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { startLogin } from "@/const";
import MobileAttendanceView from "@/components/MobileAttendanceView";
import ProgressRecorder from "@/components/ProgressRecorder";
import TaskComposer from "@/components/TaskComposer";
import LiveProgressLog from "@/components/LiveProgressLog";
import LivePointsLedger from "@/components/LivePointsLedger";
import EnrollmentManager from "@/components/EnrollmentManager";
import LiveReportSummary from "@/components/LiveReportSummary";
import LiveMessagesPanel from "@/components/LiveMessagesPanel";
import LiveStudentsView from "@/components/LiveStudentsView";
import CircleManagementPanel from "@/components/CircleManagementPanel";
import LiveScheduleView from "@/components/LiveScheduleView";
import LiveTasksView from "@/components/LiveTasksView";
import { EmptyState, MetricCard, ProgressRing, SectionHeader } from "@/components/PortalPrimitives";
import LiveDashboardSummary from "@/components/LiveDashboardSummary";

type NavItem = { label: string; path: string; icon: LucideIcon; roles: AtharRole[] };

const navItems: NavItem[] = [
  { label: "لوحة التحكم", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "guardian", "student"] },
  { label: "الحلقات", path: "/circles", icon: BookMarked, roles: ["admin", "teacher", "guardian", "student"] },
  { label: "الطلاب", path: "/students", icon: UsersRound, roles: ["admin", "teacher", "guardian"] },
  { label: "المتابعة والحفظ", path: "/progress", icon: BookOpenCheck, roles: ["admin", "teacher", "guardian", "student"] },
  { label: "الحضور", path: "/attendance", icon: ClipboardCheck, roles: ["admin", "teacher"] },
  { label: "الجدول", path: "/schedule", icon: CalendarDays, roles: ["teacher", "guardian", "student"] },
  { label: "المهام", path: "/tasks", icon: CircleDollarSign, roles: ["teacher", "guardian", "student"] },
  { label: "النقاط والإنجاز", path: "/points", icon: Trophy, roles: ["guardian", "student"] },
  { label: "التقارير", path: "/reports", icon: FileBarChart, roles: ["admin", "teacher", "guardian"] },
  { label: "الرسائل", path: "/messages", icon: MessageCircle, roles: ["teacher", "guardian", "student"] },
  { label: "الإشعارات", path: "/notifications", icon: Bell, roles: ["admin", "teacher", "guardian", "student"] },
];

const sampleCircles = [
  { id: 1, name: "حلقة الفجر", mosqueName: "جامع الهدى", level: "intermediate", capacity: 20, meetingSummary: "الأحد، الثلاثاء، الخميس · ٥:٣٠ م", status: "active", teacherName: "أحمد العمري" },
  { id: 2, name: "حلقة البراعم", mosqueName: "جامع الهدى", level: "beginner", capacity: 16, meetingSummary: "الاثنين، الأربعاء · ٤:٣٠ م", status: "active", teacherName: "أحمد العمري" },
];

const sampleNotifications = [
  { id: 1, type: "progress", title: "تحديث سجل الحفظ", body: "تم رصد الحفظ والمراجعة في جلسة اليوم.", createdAt: new Date(), isRead: false },
  { id: 2, type: "points", title: "إنجاز جديد", body: "حصل الطالب على ٢٠ نقطة تقديراً لالتزامه.", createdAt: new Date(Date.now() - 3_600_000), isRead: false },
  { id: 3, type: "attendance", title: "تسجيل حضور", body: "تم توثيق الحضور في جلسة الحلقة.", createdAt: new Date(Date.now() - 86_400_000), isRead: true },
];

function number(value: number) { return new Intl.NumberFormat("ar-SA").format(value); }
function formattedDate(date: Date | string | null | undefined) { if (!date) return "قريباً"; return new Intl.DateTimeFormat("ar-SA", { weekday: "short", day: "numeric", month: "short" }).format(new Date(date)); }

export default function Portal() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [previewRole, setPreviewRole] = useState<AtharRole>(() => {
    const requested = new URLSearchParams(window.location.search).get("preview");
    return requested && ["admin", "teacher", "guardian", "student"].includes(requested) ? requested as AtharRole : "teacher";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeRole = (user?.role || previewRole) as AtharRole;
  const dashboardQuery = trpc.platform.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const notificationsQuery = trpc.platform.notifications.list.useQuery(undefined, { enabled: isAuthenticated });
  const roleNav = navItems.filter(item => item.roles.includes(activeRole));
  const dashboard = dashboardQuery.data;
  const circles = isAuthenticated ? dashboard?.circles ?? [] : sampleCircles;
  const notifications = isAuthenticated ? notificationsQuery.data ?? dashboard?.notifications ?? [] : sampleNotifications;
  const upcoming = isAuthenticated ? dashboard?.upcomingSessions ?? [] : [
    { id: 1, title: "جلسة الحفظ والمراجعة", startsAt: new Date(Date.now() + 86_400_000), status: "scheduled", circleName: "حلقة الفجر" },
    { id: 2, title: "تسميع الأسبوع", startsAt: new Date(Date.now() + 172_800_000), status: "scheduled", circleName: "حلقة البراعم" },
  ];
  const tasks = isAuthenticated ? dashboard?.pendingTasks ?? [] : [
    { id: 1, title: "مراجعة سورة المرسلات", dueAt: new Date(Date.now() + 86_400_000), status: "assigned", pointsAvailable: 15 },
    { id: 2, title: "تسميع الورد الجديد", dueAt: new Date(Date.now() + 172_800_000), status: "assigned", pointsAvailable: 20 },
  ];
  const metrics = dashboard?.metrics ?? { circles: activeRole === "student" ? 1 : 2, students: activeRole === "student" ? 1 : activeRole === "guardian" ? 2 : 24, points: activeRole === "student" ? 560 : activeRole === "guardian" ? 940 : 3180, unreadNotifications: notifications.filter(item => !item.isRead).length };
  const activeItem = roleNav.find(item => item.path === location) || roleNav[0];

  const title = activeItem?.label || "لوحة التحكم";
  const subtitle = isAuthenticated ? `مرحباً ${user?.name || roleLabels[activeRole]}، هذه آخر مستجداتك اليوم.` : `معاينة واجهة ${roleLabels[activeRole]} — سجّل الدخول لربط الواجهة ببياناتك الفعلية.`;

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f9f7ed] text-[#174238]"><Logo /><span className="sr-only">جارٍ تحميل المنصة</span></div>;

  return <div className="min-h-screen overflow-x-hidden bg-[#f9f7ed] text-[#153f38]">
    <aside className="fixed inset-y-0 right-0 z-40 hidden w-[270px] flex-col overflow-hidden bg-[#103f38] text-white md:flex">
      <div className="islamic-grid absolute inset-0 opacity-30" />
      <div className="relative flex h-full flex-col px-4 py-6">
        <div className="flex items-center justify-between px-3"><Logo inverse /><span className="rounded-full border border-[#efd289]/20 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-[#ffe3a4]">إصدار تجريبي</span></div>
        <div className="mt-9 px-3"><p className="text-[10px] font-bold tracking-[.15em] text-white/45">المساحة الرئيسية</p></div>
        <nav className="mt-3 space-y-1" aria-label="التنقل الرئيسي">
          {roleNav.map(item => <button key={item.path} onClick={() => { setLocation(item.path); setMobileOpen(false); }} className={`group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-right text-sm font-bold transition ${location === item.path ? "bg-[#efd289] text-[#173f38] shadow-lg shadow-black/10" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><item.icon className="h-4 w-4" /><span className="flex-1">{item.label}</span>{location === item.path && <ChevronLeft className="h-4 w-4" />}</button>)}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#efd289] font-kufi text-sm font-bold text-[#173f38]">{(user?.name || roleLabels[activeRole]).charAt(0)}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{user?.name || `${roleLabels[activeRole]} المنصة`}</p><p className="mt-0.5 text-xs text-white/55">{roleLabels[activeRole]}</p></div></div>
          <div className="mt-3 border-t border-white/10 pt-2">{isAuthenticated ? <button onClick={logout} className="w-full rounded-lg px-2 py-1.5 text-right text-xs font-bold text-white/60 transition hover:bg-white/10 hover:text-white">تسجيل الخروج</button> : <button onClick={() => startLogin()} className="w-full rounded-lg px-2 py-1.5 text-right text-xs font-bold text-[#ffe3a4] transition hover:bg-white/10">ربط حسابي بالمنصة</button>}</div>
        </div>
      </div>
    </aside>

    <div className="portal-content min-h-screen md:mr-[270px]">
      <header className="sticky top-0 z-30 border-b border-[#e6e0d1] bg-[#f9f7ed]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e4dfcf] bg-white text-[#174238] md:hidden"><Menu className="h-5 w-5" /></button><div><p className="font-kufi text-sm font-bold text-[#174238]">{title}</p><p className="mt-1 hidden text-xs text-[#788077] lg:block">{subtitle}</p></div></div>
          <div className="flex items-center gap-2"><button onClick={() => setLocation("/notifications")} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#e4dfcf] bg-white text-[#3f665d] transition hover:border-[#b69a56]"><Bell className="h-4 w-4" />{metrics.unreadNotifications > 0 && <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-[#cd9b39] ring-2 ring-white" />}</button><button onClick={() => toast.info("البحث الذكي سيكون متاحاً قريباً داخل المنصة.")} className="hidden h-10 items-center gap-2 rounded-xl border border-[#e4dfcf] bg-white px-3 text-xs font-bold text-[#547168] transition hover:border-[#b69a56] sm:flex"><Search className="h-4 w-4" /><span>بحث</span></button><div className="hidden items-center gap-2 rounded-xl bg-[#e8f1e8] px-3 py-2 text-xs font-bold text-[#367968] lg:flex"><span className="h-2 w-2 rounded-full bg-[#58a276]" />متصل الآن</div></div>
        </div>
      </header>

      {!isAuthenticated && <div className="border-b border-[#eadbb6] bg-[#fff8e7] px-4 py-2.5 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold text-[#80622a]"><Sparkles className="ml-1 inline h-3.5 w-3.5" />أنت في وضع المعاينة. اختر الدور لمشاهدة الأدوات المخصصة له.</p><div className="flex rounded-lg border border-[#ead7a8] bg-white p-1">{(Object.keys(roleLabels) as AtharRole[]).map(role => <button key={role} onClick={() => setPreviewRole(role)} className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${previewRole === role ? "bg-[#174238] text-white" : "text-[#7c6d4a] hover:bg-[#fbf5e7]"}`}>{roleLabels[role]}</button>)}</div></div></div>}

      <main className="portal-main container py-7 sm:py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><p className="font-kufi text-[10px] font-bold text-[#b58727]">{activeRole === "admin" ? "إدارة مركزية" : activeRole === "teacher" ? "مساحة المعلّم" : activeRole === "guardian" ? "بوابة الأسرة" : "رحلتي القرآنية"}</p><h1 className="mt-2 font-kufi text-xl font-bold tracking-[-.04em] text-[#174238] sm:text-2xl">{title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#758178] lg:hidden">{subtitle}</p></div>{["/circles", "/attendance", "/progress", "/tasks"].includes(location) && <Button onClick={() => toast.info("تتوفر الإضافة من حساب مدير أو معلّم مصرح له.")} className="h-11 rounded-xl bg-[#174238] px-4 font-bold hover:bg-[#21594f]"><Plus className="ml-2 h-4 w-4" />إضافة جديدة</Button>}</div>
        <PageContent path={location} role={activeRole} isAuthenticated={isAuthenticated} metrics={metrics} circles={circles} notifications={notifications} upcoming={upcoming} tasks={tasks} />
      </main>
    </div>

    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="إغلاق القائمة" className="absolute inset-0 bg-[#0d4139]/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><div className="relative mr-auto flex h-full w-[82%] max-w-[310px] flex-col bg-[#103f38] p-5 text-white shadow-2xl"><div className="flex items-center justify-between"><Logo inverse /><button onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10"><X className="h-4 w-4" /></button></div><nav className="mt-8 space-y-1">{roleNav.map(item => <button key={item.path} onClick={() => { setLocation(item.path); setMobileOpen(false); }} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-right text-sm font-bold ${location === item.path ? "bg-[#efd289] text-[#174238]" : "text-white/70"}`}><item.icon className="h-4 w-4" />{item.label}</button>)}</nav></div></div>}
  </div>;
}

function PageContent({ path, role, isAuthenticated, metrics, circles, notifications, upcoming, tasks }: { path: string; role: AtharRole; isAuthenticated: boolean; metrics: { circles: number; students: number; points: number; unreadNotifications: number }; circles: Array<any>; notifications: Array<any>; upcoming: Array<any>; tasks: Array<any> }) {
  if (path === "/dashboard") return isAuthenticated ? <LiveDashboardSummary isAuthenticated={isAuthenticated} /> : <DashboardOverview role={role} metrics={metrics} circles={circles} notifications={notifications} upcoming={upcoming} tasks={tasks} />;
  if (path === "/circles") return <div className="space-y-6">{role === "admin" && <EnrollmentManager circles={circles} isAuthenticated={isAuthenticated} />}{(role === "admin" || role === "teacher") && <CircleManagementPanel circles={circles} isAuthenticated={isAuthenticated} isAdmin={role === "admin"} />}<CirclesView circles={circles} role={role} isAuthenticated={isAuthenticated} /></div>;
  if (path === "/students") return isAuthenticated ? <LiveStudentsView isAuthenticated={isAuthenticated} title={role === "guardian" ? "الأبناء المرتبطون" : "قائمة الطلاب"} /> : <StudentsView role={role} isAuthenticated={isAuthenticated} />;
  if (path === "/progress") return <div className="space-y-6">{(role === "admin" || role === "teacher") && <ProgressRecorder circles={circles} isAuthenticated={isAuthenticated} />}<LiveProgressLog isAuthenticated={isAuthenticated} /><ProgressView role={role} /></div>;
  if (path === "/attendance") return <><div className="overflow-x-hidden md:hidden"><MobileAttendanceView isAuthenticated={isAuthenticated} circles={circles} /></div><div className="hidden overflow-x-hidden md:block"><AttendanceView role={role} circles={circles} isAuthenticated={isAuthenticated} /></div></>;
  if (path === "/reports") return <LiveReportSummary isAuthenticated={isAuthenticated} />;
  if (path === "/tasks") return <div className="space-y-6">{(role === "admin" || role === "teacher") && <TaskComposer circles={circles} isAuthenticated={isAuthenticated} />}{isAuthenticated ? <LiveTasksView isAuthenticated={isAuthenticated} /> : <TasksView tasks={tasks} />}</div>;
  if (path === "/schedule") return isAuthenticated ? <LiveScheduleView isAuthenticated={isAuthenticated} /> : <ScheduleView upcoming={upcoming} />;
  if (path === "/points") return <div className="space-y-6"><LivePointsLedger isAuthenticated={isAuthenticated} /><PointsView /></div>;
  if (path === "/notifications") return <NotificationsView notifications={notifications} isAuthenticated={isAuthenticated} />;
  if (path === "/messages") return <LiveMessagesPanel isAuthenticated={isAuthenticated} />;
  return <DashboardOverview role={role} metrics={metrics} circles={circles} notifications={notifications} upcoming={upcoming} tasks={tasks} />;
}

function DashboardOverview({ role, metrics, circles, notifications, upcoming, tasks }: { role: AtharRole; metrics: any; circles: any[]; notifications: any[]; upcoming: any[]; tasks: any[] }) {
  const cards = role === "student" ? [{ label: "نقاطي", value: metrics.points, icon: Trophy, color: "gold" }, { label: "مهامي القادمة", value: tasks.length, icon: CircleDollarSign, color: "green" }, { label: "جلساتي", value: upcoming.length, icon: CalendarDays, color: "blue" }, { label: "إشعاراتي", value: metrics.unreadNotifications, icon: Bell, color: "rose" }]
    : role === "guardian" ? [{ label: "الأبناء المتابعون", value: metrics.students, icon: UsersRound, color: "green" }, { label: "إجمالي النقاط", value: metrics.points, icon: Trophy, color: "gold" }, { label: "جلسات قادمة", value: upcoming.length, icon: CalendarDays, color: "blue" }, { label: "تنبيهات جديدة", value: metrics.unreadNotifications, icon: Bell, color: "rose" }]
      : [{ label: "الحلقات النشطة", value: metrics.circles, icon: BookMarked, color: "green" }, { label: "الطلاب", value: metrics.students, icon: GraduationCap, color: "gold" }, { label: "جلسات قادمة", value: upcoming.length, icon: CalendarDays, color: "blue" }, { label: "تنبيهات جديدة", value: metrics.unreadNotifications, icon: Bell, color: "rose" }];
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <MetricCard key={card.label} {...card} />)}</div><div className="grid gap-6 xl:grid-cols-[1.35fr_.85fr]"><section className="soft-card rounded-[1.5rem] border border-[#e6e1d2] bg-white p-5 sm:p-6"><SectionHeader title={role === "student" ? "إيقاع تقدّمك" : "نظرة على هذا الأسبوع"} subtitle={role === "teacher" ? "توازن بين الحضور ورصد الحفظ" : "مؤشرات تساعدك على متابعة المسار"} action="عرض التقرير" /><div className="mt-7 grid items-center gap-6 sm:grid-cols-[.8fr_1.2fr]"><ProgressRing value={role === "student" ? 68 : 84} label={role === "student" ? "من هدف الورد" : "متوسط الحضور"} /><div><div className="flex h-40 items-end gap-2" dir="ltr">{[45, 60, 40, 70, 64, 89, 76].map((height, index) => <div key={index} className="group flex flex-1 flex-col justify-end"><div className={`rounded-t-lg transition-all group-hover:opacity-80 ${index === 5 ? "bg-[#d2a94f]" : "bg-[#3f8878]"}`} style={{ height: `${height}%` }} /><span className="mt-2 text-center text-[10px] text-[#899188]">{["س", "ح", "ن", "ث", "ر", "خ", "ج"][index]}</span></div>)}</div><div className="mt-4 flex items-center justify-between rounded-xl bg-[#f5f7ee] px-3 py-2.5 text-xs"><span className="font-bold text-[#597068]">أفضل يوم: الخميس</span><span className="font-bold text-[#b98929]">+١٨٪</span></div></div></div></section><section className="soft-card rounded-[1.5rem] border border-[#e6e1d2] bg-white p-5 sm:p-6"><SectionHeader title="استحقاقات قريبة" subtitle="لا تفوّت ما يحتاج اهتماماً" /><div className="mt-5 space-y-3">{tasks.slice(0, 3).map((task, index) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-[#eee9da] p-3"><span className={`grid h-9 w-9 place-items-center rounded-lg ${index === 0 ? "bg-[#fff2d7] text-[#b98727]" : "bg-[#eaf3ea] text-[#397a6b]"}`}><CircleDollarSign className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{task.title}</p><p className="mt-1 text-[11px] text-[#7b867e]">ينتهي {formattedDate(task.dueAt)}</p></div><span className="text-xs font-bold text-[#b98727]">+{number(task.pointsAvailable || 0)}</span></div>)}{tasks.length === 0 && <EmptyState label="لا توجد مهام قادمة حالياً" />}</div></section></div><div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><section className="soft-card rounded-[1.5rem] border border-[#e6e1d2] bg-white p-5 sm:p-6"><SectionHeader title="الحلقات" subtitle={role === "guardian" ? "الحلقات المسجل بها الأبناء" : "أقرب المجموعات نشاطاً"} action="عرض الكل" /><div className="mt-5 space-y-3">{circles.slice(0, 3).map(circle => <div key={circle.id} className="group flex items-center gap-3 rounded-xl border border-[#eee9da] p-3 transition hover:border-[#c9dfd0]"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf3ea] text-[#3d826f]"><BookOpenCheck className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{circle.name}</p><p className="mt-1 truncate text-[11px] text-[#7b867e]">{circle.meetingSummary}</p></div><ChevronLeft className="h-4 w-4 text-[#aeb6ad] transition group-hover:-translate-x-1" /></div>)}{circles.length === 0 && <EmptyState label="لم تُسجل أي حلقات بعد" />}</div></section><section className="soft-card rounded-[1.5rem] border border-[#e6e1d2] bg-white p-5 sm:p-6"><SectionHeader title="آخر المستجدات" subtitle="إشعارات منظمة حسب الأهمية" action="مركز الإشعارات" /><div className="mt-4 space-y-1">{notifications.slice(0, 4).map((notification, index) => <div key={notification.id} className={`relative flex gap-3 rounded-xl px-2 py-3 ${!notification.isRead ? "bg-[#f6f8f1]" : ""}`}><span className={`mt-1.5 h-2 w-2 rounded-full ${notification.type === "points" ? "bg-[#d4a645]" : notification.type === "attendance" ? "bg-[#6aa895]" : "bg-[#6995ad]"}`} /><div className="min-w-0 flex-1"><p className="text-xs font-bold">{notification.title}</p><p className="mt-1 truncate text-[11px] text-[#7b867e]">{notification.body}</p></div><span className="whitespace-nowrap text-[10px] text-[#9aa39b]">{index === 0 ? "الآن" : "منذ قليل"}</span></div>)}{notifications.length === 0 && <EmptyState label="لا توجد إشعارات جديدة" />}</div></section></div></div>;
}


function CirclesView({ circles, role, isAuthenticated }: { circles: any[]; role: AtharRole; isAuthenticated: boolean }) {
  const canManage = role === "admin" || role === "teacher";

  return (
    <div className="space-y-5">
      {role === "admin" && <CircleCreatePanel isAuthenticated={isAuthenticated} />}
      <div className="grid gap-4 lg:grid-cols-2">
        {circles.map((circle, index) => (
          <article key={circle.id} className="soft-card relative overflow-hidden rounded-[1.6rem] border border-[#e6e1d2] bg-white p-6">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-[#d2a94f]" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-[#e8f3e9] px-2.5 py-1 text-[10px] font-bold text-[#3b7f6c]">
                  {circle.level === "beginner" ? "مبتدئة" : "متوسطة"}
                </span>
                <h2 className="mt-4 font-kufi text-base font-bold">{circle.name}</h2>
                <p className="mt-2 text-xs text-[#78847c]">{circle.mosqueName} · {circle.teacherName || "معلّم الحلقة"}</p>
              </div>
              <button onClick={() => document.getElementById("circle-manager")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e6e1d2] text-[#5c7168]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#efebdf] pt-5">
              <div><p className="text-[10px] text-[#8a958d]">الموعد</p><p className="mt-1 text-xs font-bold">{circle.meetingSummary}</p></div>
              <div><p className="text-[10px] text-[#8a958d]">السعة</p><p className="mt-1 text-xs font-bold">{number(circle.enrollmentCount || 0)} / {number(circle.capacity)}</p></div>
            </div>
            {canManage && <Button onClick={() => document.getElementById("circle-manager")?.scrollIntoView({ behavior: "smooth", block: "start" })} variant="outline" className="mt-5 h-10 w-full rounded-xl border-[#dce5db] text-xs font-bold text-[#397c6b]">إدارة الحلقة</Button>}
          </article>
        ))}
      </div>
      {circles.length === 0 && <EmptyState label="ابدأ بإضافة أول حلقة قرآنية من خلال زر الإضافة." />}
    </div>
  );
}

function CircleCreatePanel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const teachersQuery = trpc.platform.teachers.useQuery(undefined, { enabled: isAuthenticated });
  const [name, setName] = useState("");
  const [mosqueName, setMosqueName] = useState("");
  const [meetingSummary, setMeetingSummary] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [capacity, setCapacity] = useState("20");
  const createCircle = trpc.platform.circles.create.useMutation({
    onSuccess: () => {
      utils.platform.dashboard.invalidate();
      utils.platform.circles.list.invalidate();
      setName("");
      setMosqueName("");
      setMeetingSummary("");
      setTeacherId("");
      toast.success("تم إنشاء الحلقة بنجاح.");
    },
    onError: error => toast.error(error.message),
  });

  if (!isAuthenticated) return <section className="rounded-[1.5rem] border border-[#eadbb6] bg-[#fff8e7] p-5 text-sm text-[#80622a]">سجّل الدخول بصلاحية المدير لبدء إنشاء الحلقات وربطها بالمعلمين.</section>;
  if (teachersQuery.isLoading) return <section className="rounded-[1.5rem] border border-[#e6e1d2] bg-white p-5 text-sm text-[#77847c]">جارٍ تحميل قائمة المعلمين…</section>;
  if (!teachersQuery.data?.length) return <section className="rounded-[1.5rem] border border-[#eadbb6] bg-[#fff8e7] p-5 text-sm text-[#80622a]">لا يوجد معلّم متاح بعد. أضف حساب معلّم من قسم «الطلاب» ثم أنشئ الحلقة.</section>;

  return <section className="soft-card rounded-[1.6rem] border border-[#dce6dc] bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-kufi text-sm font-bold">إنشاء حلقة جديدة</h2><p className="mt-1.5 text-xs text-[#7c877f]">أدخل بيانات الحلقة الأساسية وحدّد معلمها المسؤول.</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f3ea] text-[#397c6b]"><Plus className="h-4 w-4" /></span></div><form onSubmit={event => { event.preventDefault(); if (!teacherId) { toast.error("اختر معلّم الحلقة أولاً."); return; } createCircle.mutate({ name, mosqueName, meetingSummary, teacherId: Number(teacherId), capacity: Number(capacity), level: "beginner" }); }} className="mt-5 grid gap-3 md:grid-cols-2"><input required value={name} onChange={event => setName(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-4 text-xs outline-none transition focus:border-[#6ba08f]" placeholder="اسم الحلقة" /><input required value={mosqueName} onChange={event => setMosqueName(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-4 text-xs outline-none transition focus:border-[#6ba08f]" placeholder="اسم المسجد أو المركز" /><input required value={meetingSummary} onChange={event => setMeetingSummary(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-4 text-xs outline-none transition focus:border-[#6ba08f]" placeholder="مثال: الأحد والثلاثاء · ٥:٣٠ م" /><div className="grid grid-cols-[1fr_92px] gap-3"><select required value={teacherId} onChange={event => setTeacherId(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="">اختر المعلّم</option>{teachersQuery.data.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.email || `معلّم #${teacher.id}`}</option>)}</select><input required min="1" max="300" type="number" value={capacity} onChange={event => setCapacity(event.target.value)} className="h-11 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" aria-label="السعة" /></div><Button disabled={createCircle.isPending} type="submit" className="h-11 rounded-xl bg-[#174238] text-xs font-bold hover:bg-[#21594f] md:col-span-2">{createCircle.isPending ? "جارٍ إنشاء الحلقة…" : "إنشاء وربط المعلّم"}</Button></form></section>;
}
function StudentsView({ role, isAuthenticated }: { role: AtharRole; isAuthenticated: boolean }) {
  const students = [{ name: "محمد العتيبي", level: "جزء عمّ", progress: 78, state: "منتظم" }, { name: "ريم عبدالله", level: "سورة الملك", progress: 62, state: "متميز" }, { name: "سارة خالد", level: "جزء تبارك", progress: 43, state: "يحتاج متابعة" }];
  return <div className="space-y-6"><section className="soft-card overflow-hidden rounded-[1.6rem] border border-[#e6e1d2] bg-white"><div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="font-kufi text-sm font-bold">{role === "guardian" ? "الأبناء" : "قائمة الطلاب"}</h2><p className="mt-1 text-xs text-[#7c877f]">متابعة متوازنة للتقدّم والحضور</p></div><button onClick={() => toast.info("ستتمكن من البحث والتصفية عند إضافة سجلات الطلاب.")} className="flex h-10 items-center gap-2 rounded-xl border border-[#e4dfcf] px-3 text-xs font-bold text-[#567067]"><Search className="h-4 w-4" />بحث وتصفية</button></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-right"><thead className="bg-[#f7f8f2] text-[11px] text-[#7d877f]"><tr><th className="px-6 py-4 font-bold">الطالب</th><th className="px-6 py-4 font-bold">المسار الحالي</th><th className="px-6 py-4 font-bold">نسبة الإنجاز</th><th className="px-6 py-4 font-bold">الحالة</th><th className="px-6 py-4" /></tr></thead><tbody>{students.map(student => <tr key={student.name} className="border-t border-[#f0ecdf]"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e7f2e9] text-xs font-bold text-[#397c6b]">{student.name.charAt(0)}</span><span className="text-xs font-bold">{student.name}</span></div></td><td className="px-6 py-4 text-xs text-[#63766c]">{student.level}</td><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#eef0ea]"><span className="block h-full rounded-full bg-[#3f8878]" style={{ width: `${student.progress}%` }} /></div><span className="text-[11px] font-bold">{number(student.progress)}٪</span></div></td><td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${student.state === "يحتاج متابعة" ? "bg-[#fff1df] text-[#ae762c]" : "bg-[#e9f4eb] text-[#3a7d69]"}`}>{student.state}</span></td><td className="px-6 py-4"><button onClick={() => toast.info("سيظهر ملف الطالب التفصيلي بعد ربط بياناته.")} className="text-xs font-bold text-[#397c6b]">عرض</button></td></tr>)}</tbody></table></div></section>{role === "admin" && <AdminRoleManagement isAuthenticated={isAuthenticated} />}</div>;
}

function AdminRoleManagement({ isAuthenticated }: { isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const usersQuery = trpc.platform.users.list.useQuery(undefined, { enabled: isAuthenticated });
  const updateRole = trpc.platform.users.updateRole.useMutation({ onSuccess: () => { utils.platform.users.list.invalidate(); utils.platform.teachers.invalidate(); toast.success("تم تحديث الدور بنجاح."); }, onError: error => toast.error(error.message) });
  if (!isAuthenticated) return <section className="rounded-[1.6rem] border border-[#eadbb6] bg-[#fff8e7] p-5 text-sm text-[#80622a]">سجّل الدخول بصلاحية المدير لتعيين الأدوار للحسابات النشطة.</section>;
  return <section className="soft-card overflow-hidden rounded-[1.6rem] border border-[#e6e1d2] bg-white"><div className="p-5 sm:p-6"><h2 className="font-kufi text-sm font-bold">إدارة أدوار الحسابات</h2><p className="mt-1 text-xs text-[#7c877f]">تظهر الحسابات التي سجلت الدخول، ويمكن تحديد دور كل منها قبل إضافتها إلى حلقة.</p></div><div className="divide-y divide-[#efebdf]">{usersQuery.data?.map(account => <div key={account.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#edf4ed] text-xs font-bold text-[#397c6b]">{(account.name || "ح").charAt(0)}</div><div className="min-w-[160px] flex-1"><p className="text-xs font-bold">{account.name || "حساب دون اسم"}</p><p className="mt-1 text-[10px] text-[#89938a]">{account.email || "لا يوجد بريد ظاهر"}</p></div><div className="flex flex-wrap gap-1">{(Object.keys(roleLabels) as AtharRole[]).map(candidate => <button disabled={updateRole.isPending} key={candidate} onClick={() => updateRole.mutate({ userId: account.id, role: candidate })} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${account.role === candidate ? "bg-[#174238] text-white" : "bg-[#f4f6f0] text-[#64766d] hover:bg-[#e6f0e7]"}`}>{roleLabels[candidate]}</button>)}</div></div>)}{usersQuery.isLoading && <div className="p-6 text-center text-xs text-[#7d8980]">جارٍ تحميل الحسابات…</div>}{usersQuery.data?.length === 0 && <div className="p-6 text-center text-xs text-[#7d8980]">لا توجد حسابات نشطة بعد.</div>}</div></section>;
}
function ProgressView({ role }: { role: AtharRole }) { const isStudent = role === "student"; return <div className="grid gap-6 lg:grid-cols-[.82fr_1.18fr]"><section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-[#174238] p-6 text-white"><p className="text-xs text-[#ffe4a4]">{isStudent ? "محطة الحفظ الحالية" : "متوسط التقدم العام"}</p><h2 className="mt-3 font-kufi text-lg font-bold">{isStudent ? "سورة النبأ" : "نتابع تقدماً ثابتاً"}</h2><p className="mt-3 text-sm leading-7 text-white/65">{isStudent ? "لقد قطعت شوطاً واضحاً. ركّز اليوم على تثبيت آخر موضعين." : "تظهر المؤشرات نمواً متوازناً في الحفظ والمراجعة عبر الحلقات."}</p><div className="mt-8 h-2 overflow-hidden rounded-full bg-white/15"><span className="block h-full w-[68%] rounded-full bg-[#efd289]" /></div><div className="mt-3 flex justify-between text-xs"><span className="text-white/60">المسار المنجز</span><span className="font-bold text-[#ffe4a4]">٦٨٪</span></div></section><section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-white p-6"><SectionHeader title={isStudent ? "سجل الأسبوع" : "أحدث سجلات المتابعة"} subtitle="توثيق الحفظ والمراجعة والتجويد في وقت واحد" /><div className="mt-6 space-y-4">{[{ title: "حفظ جديد", detail: "من الآية ١ إلى الآية ١٢", mark: "ممتاز", color: "bg-[#e8f4eb] text-[#3b806b]" }, { title: "مراجعة", detail: "سورة المرسلات كاملة", mark: "جيد جداً", color: "bg-[#e8f0f5] text-[#4d8193]" }, { title: "تجويد", detail: "مخارج الحروف والمدود", mark: "مستمر", color: "bg-[#fff2dc] text-[#ad782b]" }].map(item => <div key={item.title} className="flex items-center gap-4 border-b border-[#efebdf] pb-4 last:border-0 last:pb-0"><span className="h-2 w-2 rounded-full bg-[#d2a94f]" /><div className="flex-1"><p className="text-xs font-bold">{item.title}</p><p className="mt-1 text-[11px] text-[#7c877f]">{item.detail}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.color}`}>{item.mark}</span></div>)}</div></section></div>; }
function AttendanceView({ role, circles, isAuthenticated }: { role: AtharRole; circles: any[]; isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [circleId, setCircleId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("جلسة الحفظ والمراجعة");
  const [startsAt, setStartsAt] = useState("");
  const [attendanceState, setAttendanceState] = useState<Record<number, "present" | "late" | "absent" | "excused">>({});
  const sessionsQuery = trpc.platform.sessions.list.useQuery(undefined, { enabled: isAuthenticated });
  const selectedSession = sessionsQuery.data?.find(session => session.id === Number(selectedSessionId));
  const studentsQuery = trpc.platform.circles.students.useQuery({ circleId: selectedSession?.circleId || 0 }, { enabled: isAuthenticated && Boolean(selectedSession?.circleId) });
  const createSession = trpc.platform.sessions.create.useMutation({ onSuccess: data => { utils.platform.sessions.list.invalidate(); setSelectedSessionId(String(data.id)); toast.success("تم إنشاء الجلسة. يمكنك الآن رصد الحضور."); }, onError: error => toast.error(error.message) });
  const recordAttendance = trpc.platform.attendance.record.useMutation({ onSuccess: (_result, variables) => { setAttendanceState(current => ({ ...current, [variables.studentId]: variables.status })); utils.platform.dashboard.invalidate(); utils.platform.notifications.list.invalidate(); toast.success("تم حفظ حالة الحضور وإطلاق الإشعار المناسب."); }, onError: error => toast.error(error.message) });
  const statusMap: Record<string, "present" | "late" | "absent"> = { "حاضر": "present", "متأخر": "late", "غائب": "absent" };

  if (!isAuthenticated) return <section className="rounded-[1.6rem] border border-[#eadbb6] bg-[#fff8e7] p-6 text-sm text-[#80622a]">هذه معاينة لواجهة الحضور. سجّل الدخول كمدير أو معلّم لإنشاء جلسة وحفظ السجلات فعلياً.</section>;
  return <div className="w-full min-w-0 space-y-6"><section className="soft-card w-full min-w-0 rounded-[1.6rem] border border-[#e6e1d2] bg-white p-5 sm:p-6"><h2 className="font-kufi text-sm font-bold">تهيئة جلسة الحضور</h2><p className="mt-1.5 text-xs text-[#7c877f]">أنشئ جلسة جديدة أو اختر جلسة قائمة، ثم سجّل حالة كل طالب.</p><div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2"><select value={selectedSessionId} onChange={event => { setSelectedSessionId(event.target.value); setAttendanceState({}); }} className="h-11 w-full min-w-0 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="">اختر جلسة قائمة</option>{sessionsQuery.data?.map(session => <option key={session.id} value={session.id}>{session.circleName} — {session.title} ({formattedDate(session.startsAt)})</option>)}</select><div className="flex min-w-0 items-center gap-2 text-xs text-[#829087]"><span className="h-px flex-1 bg-[#e6e1d4]" />أو أنشئ جلسة<span className="h-px flex-1 bg-[#e6e1d4]" /></div><select value={circleId} onChange={event => setCircleId(event.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none"><option value="">اختر الحلقة</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select><input value={sessionTitle} onChange={event => setSessionTitle(event.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" placeholder="عنوان الجلسة" /><input value={startsAt} onChange={event => setStartsAt(event.target.value)} type="datetime-local" className="h-11 w-full min-w-0 rounded-xl border border-[#e2e0d4] bg-[#fcfdf9] px-3 text-xs outline-none" /><Button disabled={createSession.isPending || !circleId || !startsAt} onClick={() => createSession.mutate({ circleId: Number(circleId), title: sessionTitle, startsAt: new Date(startsAt) })} className="h-11 w-full rounded-xl bg-[#174238] text-xs font-bold hover:bg-[#21594f]">إنشاء الجلسة</Button></div></section>{selectedSession && <section className="soft-card w-full min-w-0 overflow-hidden rounded-[1.6rem] border border-[#e6e1d2] bg-white"><div className="flex flex-wrap items-center justify-between gap-4 p-6"><div><h2 className="font-kufi text-sm font-bold">{selectedSession.title} · {selectedSession.circleName}</h2><p className="mt-1 text-xs text-[#7c877f]">{formattedDate(selectedSession.startsAt)}</p></div><div className="rounded-xl bg-[#eaf3ea] px-3 py-2 text-xs font-bold text-[#397c6b]">الحفظ فوري</div></div><div className="divide-y divide-[#f0ecdf]">{studentsQuery.data?.map(student => <div key={student.id} className="flex min-w-0 items-center gap-4 px-6 py-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f2f5ef] text-xs font-bold text-[#5c7168]">{(student.name || "ط").charAt(0)}</span><p className="min-w-0 flex-1 truncate text-xs font-bold">{student.name || "طالب"}</p><div className="flex shrink-0 rounded-lg border border-[#e6e1d2] p-1">{Object.keys(statusMap).map(status => { const active = attendanceState[student.id] === statusMap[status]; return <button disabled={recordAttendance.isPending} key={status} onClick={() => recordAttendance.mutate({ sessionId: selectedSession.id, studentId: student.id, status: statusMap[status] })} className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition disabled:opacity-50 ${active ? "bg-[#174238] text-white" : "text-[#64786e] hover:bg-[#e9f4eb] hover:text-[#397c6b]"}`}>{status}</button>; })}</div></div>)}{studentsQuery.data?.length === 0 && <EmptyState label="لا يوجد طلاب نشطون في هذه الحلقة بعد." />}</div></section>}</div>;
}
function ReportsView({ role }: { role: AtharRole }) { return <div className="grid gap-6 lg:grid-cols-3"><section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-white p-6 lg:col-span-2"><SectionHeader title="ملخص الأداء الدوري" subtitle={role === "guardian" ? "تقرير مبسط عن رحلة الأبناء" : "تقرير متوازن يمكن تصديره ومشاركته"} action="تصدير التقرير" /><div className="mt-8 grid gap-4 sm:grid-cols-3">{[{ label: "الحفظ", value: "٧٦٪", accent: "#3f8878" }, { label: "المراجعة", value: "٦٩٪", accent: "#4d8193" }, { label: "الالتزام", value: "٩٢٪", accent: "#d2a94f" }].map(stat => <div key={stat.label} className="rounded-2xl bg-[#f6f8f1] p-4"><p className="text-xs font-bold text-[#748077]">{stat.label}</p><p className="mt-3 font-kufi text-xl font-bold" style={{ color: stat.accent }}>{stat.value}</p><div className="mt-4 h-1.5 rounded-full bg-white"><span className="block h-full rounded-full" style={{ width: stat.value, background: stat.accent }} /></div></div>)}</div></section><section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-[#fffdf6] p-6"><FileBarChart className="h-6 w-6 text-[#c29739]" /><h2 className="mt-5 font-kufi text-sm font-bold">تقرير قابل للفهم</h2><p className="mt-3 text-sm leading-7 text-[#738077]">يُظهر أهم نقاط التقدم والملاحظات، ويصل إلى ولي الأمر داخل المنصة فور اكتماله.</p><Button onClick={() => toast.info("تجهيز ملف التقرير سيكون متاحاً بعد اكتمال بيانات الحلقة.")} variant="outline" className="mt-6 h-10 w-full rounded-xl border-[#e6d7b5] text-xs font-bold text-[#997329]">معاينة نموذج التقرير</Button></section></div>; }
function TasksView({ tasks }: { tasks: any[] }) { return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tasks.map((task, index) => <article key={task.id} className="soft-card relative overflow-hidden rounded-[1.5rem] border border-[#e6e1d2] bg-white p-5"><span className={`absolute left-0 top-0 h-full w-1.5 ${index === 0 ? "bg-[#d2a94f]" : "bg-[#3f8878]"}`} /><div className="flex items-start justify-between"><span className="rounded-full bg-[#f5f7ef] px-2.5 py-1 text-[10px] font-bold text-[#587168]">مهمة حفظ</span><span className="font-kufi text-xs font-bold text-[#b8892d]">+{number(task.pointsAvailable || 0)}</span></div><h2 className="mt-5 font-kufi text-sm font-bold">{task.title}</h2><p className="mt-3 text-xs leading-6 text-[#7a867e]">خطة واضحة تساعد الطالب على إنجاز المطلوب قبل موعد الجلسة القادمة.</p><div className="mt-5 flex items-center justify-between border-t border-[#efebdf] pt-4"><span className="text-[11px] text-[#839087]">تُستحق {formattedDate(task.dueAt)}</span><button onClick={() => toast.success("تم تسجيل إنجاز المهمة. سيظهر التحديث في سجل التقدم.")} className="text-xs font-bold text-[#397c6b]">بدء المهمة</button></div></article>)}{tasks.length === 0 && <EmptyState label="لا توجد مهام مسندة حالياً." />}</div>; }
function ScheduleView({ upcoming }: { upcoming: any[] }) { return <section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-white p-6"><SectionHeader title="جدولك القادم" subtitle="كل جلسة ومهمة في موضعها المناسب" /><div className="mt-7 space-y-4">{upcoming.map((item, index) => <div key={item.id} className="flex gap-4"><div className="flex flex-col items-center"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf3ea] text-[#397c6b]"><CalendarDays className="h-4 w-4" /></span>{index < upcoming.length - 1 && <span className="mt-2 h-8 w-px bg-[#dfe9df]" />}</div><div className="flex-1 rounded-xl border border-[#eee9da] p-4"><p className="text-xs font-bold">{item.title}</p><p className="mt-1 text-[11px] text-[#7a867e]">{item.circleName || "الحلقة"} · {formattedDate(item.startsAt)}</p></div></div>)}</div></section>; }
function PointsView() { return <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="relative overflow-hidden rounded-[1.6rem] bg-[#174238] p-7 text-white"><div className="islamic-grid absolute inset-0 opacity-35" /><div className="relative"><Crown className="h-7 w-7 text-[#efd289]" /><p className="mt-6 text-xs text-white/60">رصيد الإنجاز</p><p className="mt-2 font-kufi text-4xl font-bold text-[#ffe3a4]">٥٦٠</p><p className="mt-4 text-sm leading-7 text-white/65">بقي ٤٠ نقطة للانتقال إلى المستوى التالي.</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><span className="block h-full w-[76%] rounded-full bg-[#efd289]" /></div></div></section><section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-white p-6"><SectionHeader title="مصادر النقاط" subtitle="كل إنجاز له أثر واضح في رصيدك" /><div className="mt-5 space-y-4">{[{ label: "إتمام ورد الحفظ", value: "+٢٠", icon: BookOpenCheck }, { label: "حضور منتظم", value: "+١٠", icon: UserRoundCheck }, { label: "تحدي المراجعة", value: "+١٥", icon: Trophy }].map(entry => <div key={entry.label} className="flex items-center gap-3 rounded-xl bg-[#f7f8f2] p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#397c6b]"><entry.icon className="h-4 w-4" /></span><p className="flex-1 text-xs font-bold">{entry.label}</p><span className="font-kufi text-xs font-bold text-[#b8892d]">{entry.value}</span></div>)}</div></section></div>; }
function NotificationsView({ notifications, isAuthenticated }: { notifications: any[]; isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const markRead = trpc.platform.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.platform.notifications.list.invalidate();
      utils.platform.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const markAll = () => notifications.filter(item => !item.isRead).forEach(item => markRead.mutate({ notificationId: item.id }));

  return <section className="soft-card rounded-[1.6rem] border border-[#e6e1d2] bg-white p-5 sm:p-6"><SectionHeader title="مركز الإشعارات" subtitle="أحداث مهمة تُرتب لك حسب وقتها" /><button onClick={markAll} disabled={!isAuthenticated || markRead.isPending} className="mt-4 text-xs font-bold text-[#397c6b] disabled:cursor-not-allowed disabled:opacity-50">تحديد الكل كمقروء</button><div className="mt-2 divide-y divide-[#efebdf]">{notifications.map((notification, index) => <button onClick={() => { if (isAuthenticated && !notification.isRead) markRead.mutate({ notificationId: notification.id }); else if (!isAuthenticated) toast.info("سجّل الدخول لتحديث حالة الإشعارات."); }} key={notification.id} className="flex w-full items-start gap-4 px-2 py-4 text-right transition hover:bg-[#fafbf7]"><span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${notification.type === "points" ? "bg-[#d2a94f]" : notification.type === "attendance" ? "bg-[#4b9880]" : "bg-[#628ca0]"}`} /><div className="flex-1"><p className="text-xs font-bold">{notification.title}</p><p className="mt-1.5 text-xs leading-6 text-[#78847c]">{notification.body}</p></div><span className="text-[10px] text-[#9aa39b]">{index === 0 ? "الآن" : "اليوم"}</span>{!notification.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-[#d2a94f]" />}</button>)}{notifications.length === 0 && <EmptyState label="ليس لديك إشعارات جديدة." />}</div></section>;
}
function MessagesView({ role }: { role: AtharRole }) { const contact = role === "teacher" ? "ولي أمر محمد العتيبي" : role === "guardian" ? "الأستاذ أحمد العمري" : "المعلّم أحمد العمري"; return <div className="grid overflow-hidden rounded-[1.6rem] border border-[#e6e1d2] bg-white shadow-[0_18px_45px_rgba(32,72,62,.08)] md:grid-cols-[270px_1fr]"><aside className="border-b border-[#efebdf] bg-[#fbfcf8] p-4 md:border-b-0 md:border-l"><p className="mb-4 text-xs font-bold text-[#6e7d74]">المحادثات</p><button className="flex w-full items-center gap-3 rounded-xl bg-[#e8f3e9] p-3 text-right"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#397c6b] text-xs font-bold text-white">أ</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{contact}</span><span className="mt-1 block truncate text-[10px] text-[#748077]">آخر تواصل داخل المنصة</span></span></button></aside><section className="flex min-h-[380px] flex-col"><div className="border-b border-[#efebdf] p-5"><p className="text-xs font-bold">{contact}</p><p className="mt-1 text-[10px] text-[#6a9a83]">متصل داخل المنصة</p></div><div className="flex-1 space-y-3 p-5"><div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-[#eaf3ea] p-3 text-xs leading-6 text-[#4a635a]">السلام عليكم، تم تحديث خطة المراجعة لهذا الأسبوع.</div><div className="mr-auto max-w-[75%] rounded-2xl rounded-tl-sm bg-[#f4f5f0] p-3 text-xs leading-6 text-[#4a635a]">وعليكم السلام، شكرًا لكم. سنراجعها اليوم بإذن الله.</div></div><div className="flex gap-2 border-t border-[#efebdf] p-4"><input aria-label="اكتب رسالتك" className="h-11 flex-1 rounded-xl border border-[#e3dfd1] bg-[#fbfcf8] px-4 text-xs outline-none transition focus:border-[#6ba08f]" placeholder="اكتب رسالة محترمة ومباشرة..." /><Button onClick={() => toast.success("تم إرسال الرسالة وإشعار المستلم داخل المنصة.")} className="h-11 rounded-xl bg-[#174238] px-4"><Mail className="h-4 w-4" /></Button></div></section></div>; }
