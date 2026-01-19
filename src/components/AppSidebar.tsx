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

// Define menu items with role-based visibility
const getMenuItems = (userRole: string | null, shopRole: string | null) => {
  const isCashier = shopRole === 'cashier';
  const isOwnerOrManager = shopRole === 'owner' || shopRole === 'manager';
  const isAdmin = userRole === 'admin';
  
  // Base items available to all staff
  const baseItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, visible: true },
    { title: "Medicines", url: "/medicines", icon: Pill, visible: true },
    { title: "Cosmetics", url: "/cosmetics", icon: Sparkles, visible: true },
    { title: "Sales", url: "/sales", icon: ShoppingCart, visible: true },
  ];

  // Items hidden from cashiers
  const managerItems = [
    { title: "Expenses", url: "/expenses", icon: Receipt, visible: !isCashier },
    { title: "Customers", url: "/customers", icon: UserCheck, visible: true },
    { title: "Reports", url: "/reports", icon: FileText, visible: !isCashier },
    { title: "Returns History", url: "/returns-history", icon: RotateCcw, visible: true },
    { title: "Salesmen", url: "/salesmen", icon: Users, visible: !isCashier },
    { title: "Suppliers", url: "/suppliers", icon: Building2, visible: !isCashier },
  ];

  // Settings only for owners/managers/admins
  const settingsItems = [
    { title: "Settings", url: "/settings", icon: Settings, visible: !isCashier || isAdmin },
  ];

  return [...baseItems, ...managerItems, ...settingsItems].filter(item => item.visible);
};

const getAdminItems = (userRole: string | null, shopRole: string | null) => {
  const isAdmin = userRole === 'admin';
  const isOwner = shopRole === 'owner';
  
  // User Management visible only to admins
  if (isAdmin) {
    return [{ title: "User Management", url: "/users", icon: Shield }];
  }
  
  return [];
};

const getSuperAdminItems = (isSuperAdmin: boolean) => {
  if (isSuperAdmin) {
    return [{ title: "Shop Management", url: "/admin", icon: Store }];
  }
  return [];
};

export function AppSidebar() {
  const { state } = useSidebar();
  const { userRole, shopStaffInfo } = useAuth();
  const { isSuperAdmin, currentShop } = useShop();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === "collapsed";

  const shopRole = shopStaffInfo?.shop_role || null;
  const menuItems = getMenuItems(userRole, shopRole);
  const adminItems = getAdminItems(userRole, shopRole);
  const superAdminItems = getSuperAdminItems(isSuperAdmin);

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
              {menuItems.map((item) => (
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

        {adminItems.length > 0 && (
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

        {superAdminItems.length > 0 && (
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