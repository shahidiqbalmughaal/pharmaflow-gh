import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { ShopSelector } from "./ShopSelector";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="mr-2" />
              <ShopSelector />
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </header>
          <main className="flex-1 p-6 bg-secondary/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
