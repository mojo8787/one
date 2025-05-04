import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Gauge,
  CalendarCheck,
  Wrench,
  MapPin,
  CheckCircle,
  LogOut,
  User,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";

interface TechnicianLayoutProps {
  children: ReactNode;
}

export const TechnicianLayout: React.FC<TechnicianLayoutProps> = ({ children }) => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { icon: <Gauge className="w-5 h-5" />, label: "Dashboard", path: "/technician/dashboard" },
    { icon: <CalendarCheck className="w-5 h-5" />, label: "My Jobs", path: "/technician/jobs" },
    { icon: <Wrench className="w-5 h-5" />, label: "Service History", path: "/technician/history" },
    { icon: <MapPin className="w-5 h-5" />, label: "Route Planner", path: "/technician/route" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-primary text-white py-3 px-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-7 w-7" />
            <h1 className="text-xl font-bold">PureFlow Tech</h1>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative p-2">
                  <User className="h-5 w-5 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 border-b">
                  <p className="font-medium text-sm">{user?.username || "Technician"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 shadow-sm">
          <nav className="p-3">
            <ul className="space-y-1.5">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link href={item.path}>
                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer ${
                        location === item.path
                          ? "bg-primary text-white font-medium"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-10">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex flex-col items-center p-1.5 rounded-md ${
                  location === item.path
                    ? "text-primary"
                    : "text-gray-500"
                }`}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
};