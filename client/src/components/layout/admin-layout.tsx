import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  Gauge,
  Users,
  CalendarCheck,
  Bolt,
  CreditCard,
  BarChart,
  Settings,
  SwatchBook,
  LogOut,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/ui/notification-bell";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // We no longer need to fetch notifications here as NotificationBell component handles this

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { icon: <Gauge className="w-6" />, label: "Dashboard", path: "/admin/dashboard" },
    { icon: <Users className="w-6" />, label: "Subscriptions", path: "/admin/subscriptions" },
    { icon: <CalendarCheck className="w-6" />, label: "Maintenance Jobs", path: "/admin/jobs" },
    { icon: <Bolt className="w-6" />, label: "Technicians", path: "/admin/technicians" },
    { icon: <CreditCard className="w-6" />, label: "Payments", path: "/admin/payments" },
    { icon: <BarChart className="w-6" />, label: "Reports", path: "/admin/reports" },
    { icon: <Settings className="w-6" />, label: "Settings", path: "/admin/settings" },
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Admin Header */}
      <header className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <SwatchBook className="h-6 w-6" />
            <h1 className="text-xl font-bold">PureFlow Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            
            <div className="flex items-center space-x-2">
              <span>{user?.username || "Admin"}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white cursor-pointer">
                    {user?.username?.charAt(0).toUpperCase() || "A"}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 border-b">
                    <p className="font-medium text-sm">{user?.username || "Admin"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <div className="flex-grow flex">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-100 border-r">
          <nav className="p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link href={item.path}>
                    <div
                      className={`w-full flex items-center p-3 rounded-md ${
                        location === item.path
                          ? "bg-primary-dark text-white"
                          : "text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-grow p-6 bg-gray-50 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
