import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full flex flex-col h-screen">
        <div className="p-4 shrink-0">
          <SidebarTrigger />
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </SidebarProvider>
  );
}
