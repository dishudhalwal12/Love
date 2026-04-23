import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/mobile/MobileNav";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute>
      <div className="flex w-full h-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 scrollbar-hide">
            {children}
          </main>
          <MobileNav />
        </div>
      </div>
    </ProtectedRoute>
  );
}
