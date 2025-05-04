import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Calendar, CreditCard, Settings, SwatchBook, UserCircle } from "lucide-react";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/ui/notification-bell";

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // NotificationBell component now handles notification fetching

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white p-4 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <SwatchBook className="h-6 w-6" />
            <h1 className="text-xl font-bold">PureFlow</h1>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button className="p-2">
                  <UserCircle className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="absolute right-2 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <DropdownMenuItem className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t shadow-md">
        <div className="flex justify-around">
          <Link href="/customer/dashboard">
            <div className={`p-3 flex flex-col items-center ${location === '/customer/dashboard' ? 'text-primary' : 'text-gray-600'}`}>
              <Home className="h-6 w-6" />
              <span className="text-xs mt-1">Home</span>
            </div>
          </Link>
          <Link href="/customer/schedule">
            <div className={`p-3 flex flex-col items-center ${location === '/customer/schedule' ? 'text-primary' : 'text-gray-600'}`}>
              <Calendar className="h-6 w-6" />
              <span className="text-xs mt-1">Schedule</span>
            </div>
          </Link>
          <Link href="/customer/billing">
            <div className={`p-3 flex flex-col items-center ${location === '/customer/billing' ? 'text-primary' : 'text-gray-600'}`}>
              <CreditCard className="h-6 w-6" />
              <span className="text-xs mt-1">Billing</span>
            </div>
          </Link>
          <Link href="/customer/settings">
            <div className={`p-3 flex flex-col items-center ${location === '/customer/settings' ? 'text-primary' : 'text-gray-600'}`}>
              <Settings className="h-6 w-6" />
              <span className="text-xs mt-1">Settings</span>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
};
