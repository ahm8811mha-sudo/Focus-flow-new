import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutGrid, LogOut, PanelLeft, Calendar, Kanban, FileText, FolderOpen, BarChart3, Settings, Search } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
  { icon: LayoutGrid, label: "المهام", path: "/tasks" },
  { icon: Calendar, label: "التقويم", path: "/calendar" },
  { icon: Kanban, label: "كانبان", path: "/kanban" },
  { icon: FileText, label: "الملاحظات", path: "/notes" },
  { icon: FolderOpen, label: "المشاريع", path: "/projects" },
  { icon: BarChart3, label: "الإحصائيات", path: "/statistics" },
  { icon: Search, label: "بحث متقدم", path: "/search" },
  { icon: Settings, label: "الإعدادات", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-[#050505] overflow-hidden" dir="rtl">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-orange-600/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center gap-8 p-10 max-w-md w-full mx-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center shadow-[0_0_30px_rgba(201,162,77,0.5)]"
            >
              <LayoutGrid className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-center text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              مرحباً بعودتك
            </h1>
            <p className="text-sm text-white/50 text-center max-w-sm leading-relaxed">
              بوابتك للتحكم بمشاريعك وملاحظاتك بتقنية 3D. يرجى تسجيل الدخول للمتابعة.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full h-12 text-md font-medium bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all duration-300 rounded-xl"
          >
            تسجيل الدخول للمنصة
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="bg-[#030303] min-h-screen text-slate-200">
      <SidebarProvider
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
    </div>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-l border-white/10 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-[10px_0_30px_rgba(0,0,0,0.5)]"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-20 justify-center border-b border-white/5">
            <div className="flex items-center gap-3 px-3 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none shrink-0 group"
                aria-label="تبديل التنقل"
              >
                <PanelLeft className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
              </button>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <span className="font-bold text-lg tracking-tight truncate bg-clip-text text-transparent bg-gradient-to-l from-white to-white/60">
                      Lateen Notes 3D
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-2 p-3 mt-2">
            <SidebarMenu className="gap-1.5">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="relative h-12 w-full group overflow-hidden rounded-xl border border-transparent transition-all duration-300"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-sidebar-item"
                          className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                          initial={false}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-l-full shadow-[0_0_15px_#c9a24d]" />
                        </motion.div>
                      )}

                      {!isActive && (
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 rounded-xl transition-colors duration-300" />
                      )}

                      <div className={`relative z-10 flex items-center gap-3 px-2 w-full transition-colors duration-300 ${isActive ? "text-primary" : "text-white/60 group-hover:text-white"}`}>
                        <item.icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(201,162,77,0.8)]" : "group-hover:scale-110"}`} />
                        <span className="font-medium tracking-wide text-[15px]">{item.label}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-white/5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-300 w-full text-right group-data-[collapsible=icon]:justify-center focus:outline-none group">
                  <Avatar className="h-10 w-10 border border-white/10 shrink-0 group-hover:border-primary/50 transition-colors shadow-lg">
                    <AvatarFallback className="bg-[#111] text-white text-sm font-bold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-[15px] font-semibold text-white truncate leading-none mb-1.5">
                      {user?.name || "المستخدم"}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {user?.email || "جاري التحميل..."}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 rounded-lg transition-colors p-3 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-white/10 h-16 items-center justify-between bg-[#0a0a0a]/80 px-4 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-white tracking-tight">
                  {activeMenuItem?.label ?? "القائمة"}
                </span>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-h-screen relative overflow-hidden bg-[#020202]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 p-6 md:p-8 h-full"
          >
            {children}
          </motion.div>
        </main>
      </SidebarInset>
    </>
  );
}
