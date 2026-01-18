import { 
  LayoutDashboard, 
  Pill, 
  Sparkles, 
  ShoppingCart, 
  FileText, 
  Users, 
  Building2,
  UserCheck,
  Settings,
  Shield,
  Receipt,
  RotateCcw,
  Store
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useShop } from "@/hooks/useShop";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Medicines", url: "/medicines", icon: Pill },
  { title: "Cosmetics", url: "/cosmetics", icon: Sparkles },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Customers", url: "/customers", icon: UserCheck },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Returns History", url: "/returns-history", icon: RotateCcw },
  { title: "Salesmen", url: "/salesmen", icon: Users },
  { title: "Suppliers", url: "/suppliers", icon: Building2 },
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminItems = [
  { title: "User Management", url: "/users", icon: Shield },
];

const superAdminItems = [
  { title: "Shop Management", url: "/admin", icon: Store },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { userRole } = useAuth();
  const { isSuperAdmin, currentShop } = useShop();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <h2 className="text-lg font-bold text-sidebar-foreground truncate">
              {currentShop?.shop_name || "Pharmacy POS"}
            </h2>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userRole === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
