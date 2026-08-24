import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { Bell, BookOpenCheck, ChartNoAxesCombined, ClipboardCheck, LayoutDashboard, LogOut, ScrollText, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type Item = { label: string; path: string; icon: typeof LayoutDashboard; roles: string[] };
const items: Item[] = [
  { label: "الرئيسية", path: "/app", icon: LayoutDashboard, roles: ["admin", "teacher", "guardian", "student"] },
  { label: "الحلقات", path: "/app/circles", icon: BookOpenCheck, roles: ["admin", "teacher"] },
  { label: "المستخدمون", path: "/app/people", icon: UsersRound, roles: ["admin"] },
  { label: "الجلسات والحضور", path: "/app/sessions", icon: ClipboardCheck, roles: ["admin", "teacher"] },
  { label: "التقدم", path: "/app/progress", icon: ChartNoAxesCombined, roles: ["admin", "teacher", "guardian", "student"] },
  { label: "التقارير", path: "/app/reports", icon: ScrollText, roles: ["admin", "teacher"] },
  { label: "الإشعارات", path: "/app/notifications", icon: Bell, roles: ["admin", "teacher", "guardian", "student"] },
];
const roles: Record<string, string> = { admin: "مدير المؤسسة", teacher: "معلم", guardian: "ولي أمر", student: "طالب" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div dir="rtl" className="grid min-h-screen place-items-center bg-[#f6f8f4] p-5"><div className="w-full max-w-md rounded-3xl border border-[#dfe8e1] bg-white p-8 text-center shadow-[0_24px_60px_-42px_rgba(21,58,48,0.55)]"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#193a31] text-[#e8d7a7]"><BookOpenCheck className="size-6" /></span><h1 className="mt-5 font-display text-2xl font-semibold text-[#193a31]">تسجيل الدخول إلى أثر</h1><p className="mt-2 text-sm leading-7 text-[#718078]">لوحات المنصة محمية وتعرض فقط البيانات المرتبطة بحسابك ودورك.</p><Button onClick={() => startLogin()} className="mt-6 h-11 w-full rounded-xl bg-[#276654] text-white hover:bg-[#1e5545]">تسجيل الدخول الآمن</Button></div></div>;
  const menuItems = items.filter(item => item.roles.includes(user.role));
  return <div dir="rtl"><SidebarProvider><Sidebar side="right" collapsible="icon" className="border-l border-[#dfe8e1] bg-[#fbfdfb]"><SidebarHeader className="p-4"><button onClick={() => setLocation("/")} className="flex items-center gap-3 text-right"><span className="grid size-10 place-items-center rounded-2xl bg-[#193a31] text-[#e8d7a7]"><BookOpenCheck className="size-5" /></span><span className="group-data-[collapsible=icon]:hidden"><strong className="font-display block text-lg text-[#193a31]">أثر</strong><small className="text-xs text-[#789087]">إدارة الحلقات</small></span></button></SidebarHeader><SidebarContent className="px-3"><p className="px-2 pt-3 text-[11px] font-bold tracking-[0.14em] text-[#98a59e] group-data-[collapsible=icon]:hidden">مساحة العمل</p><SidebarMenu className="mt-2">{menuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 rounded-xl text-right text-[#53685f] data-[active=true]:bg-[#e7f1e9] data-[active=true]:text-[#24634f]"><item.icon className="size-[18px]" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-2xl bg-[#f1f5f1] p-2 text-right transition hover:bg-[#e7efe8]"><Avatar className="size-9"><AvatarFallback className="bg-[#dbe9df] text-sm text-[#285a49]">{user.name?.trim().charAt(0) || "أ"}</AvatarFallback></Avatar><span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><strong className="block truncate text-sm text-[#29483e]">{user.name ?? "حساب أثر"}</strong><small className="block truncate text-xs text-[#7a8980]">{roles[user.role]}</small></span></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600"><LogOut className="ml-2 size-4" />تسجيل الخروج</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><SidebarInset className="bg-[#f6f8f4]"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#dfe8e1] bg-[#f6f8f4]/90 px-4 backdrop-blur lg:px-8"><div className="flex items-center gap-2"><SidebarTrigger className="rounded-xl border border-[#dce6df] bg-white text-[#315b4e]" /><span className="hidden text-sm font-semibold text-[#5f7269] sm:block">{roles[user.role]}</span></div><button onClick={() => setLocation("/app/notifications")} className="relative flex size-9 items-center justify-center rounded-xl border border-[#dce6df] bg-white text-[#315b4e]"><Bell className="size-4" /><span className="absolute left-1 top-1 size-1.5 rounded-full bg-[#c99033]" /></button></header><main className="flex-1 p-4 lg:p-8">{children}</main></SidebarInset></SidebarProvider></div>;
}
