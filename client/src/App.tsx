import React from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { OnboardingState } from "@shared/schema";
import { Loader2 } from "lucide-react";

// Page imports
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

// Customer pages
import CustomerOnboarding from "@/pages/customer/onboarding";
import CustomerSubscriptionSelection from "@/pages/customer/subscription-selection";
import CustomerAddressSelection from "@/pages/customer/address-selection";
import CustomerPaymentOptions from "@/pages/customer/payment-options";
import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerCheckout from "@/pages/customer/checkout";
import CustomerSubscribe from "@/pages/customer/subscribe";

// Technician pages
import TechnicianDashboard from "@/pages/technician/dashboard";
import TechnicianJobs from "@/pages/technician/jobs";
import TechnicianJobDetails from "@/pages/technician/job-details";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminJobs from "@/pages/admin/jobs";
import AdminTechnicians from "@/pages/admin/technicians";
import AdminPayments from "@/pages/admin/payments";
import AdminReports from "@/pages/admin/reports";
import AdminSettings from "@/pages/admin/settings";

// Customer additional pages
import CustomerSchedule from "@/pages/customer/schedule";
import CustomerBilling from "@/pages/customer/billing";
import CustomerSettings from "@/pages/customer/settings";
import ManageSubscription from "@/pages/customer/manage-subscription";

// This component will handle the redirection logic based on user role and onboarding state
function RootRedirect() {
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  
  const { data: onboardingState, isLoading: isLoadingOnboarding } = useQuery<OnboardingState>({
    queryKey: ["/api/onboarding"],
    enabled: !!user && user.role === "customer",
  });
  
  // Use useEffect to handle navigation after render
  React.useEffect(() => {
    if (isLoading || (user?.role === "customer" && isLoadingOnboarding)) {
      return; // Wait until loading is complete
    }
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    switch (user.role) {
      case "admin":
        navigate("/admin/dashboard");
        break;
      case "technician":
        navigate("/technician/dashboard");
        break;
      case "customer":
        // Check onboarding state for customers
        if (onboardingState) {
          // Redirect based on onboarding step
          const step = onboardingState.step as 'account' | 'plan' | 'address' | 'payment' | 'complete';
          switch (step) {
            case "account":
              navigate("/customer/onboarding");
              break;
            case "plan":
              navigate("/customer/subscription");
              break;
            case "address":
              navigate("/customer/address");
              break;
            case "payment":
              navigate("/customer/payment");
              break;
            case "complete":
              navigate("/customer/dashboard");
              break;
            default:
              navigate("/customer/onboarding");
          }
        } else {
          // If no onboarding state found, start from the beginning
          navigate("/customer/onboarding");
        }
        break;
      default:
        navigate("/auth");
    }
  }, [user, isLoading, onboardingState, isLoadingOnboarding, navigate]);
  
  // Always render loading indicator while navigation decisions are being made
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Root path redirects to appropriate dashboard, onboarding, or auth */}
      <Route path="/" component={RootRedirect} />
      <ProtectedRoute path="/customer/dashboard" component={CustomerDashboard} requiredRole="customer" />
      <ProtectedRoute path="/customer/schedule" component={CustomerSchedule} requiredRole="customer" />
      <ProtectedRoute path="/customer/billing" component={CustomerBilling} requiredRole="customer" />
      <ProtectedRoute path="/customer/settings" component={CustomerSettings} requiredRole="customer" />
      <ProtectedRoute path="/customer/manage-subscription" component={ManageSubscription} requiredRole="customer" />
      
      {/* Customer Onboarding Flow */}
      <ProtectedRoute path="/customer/onboarding" component={CustomerOnboarding} requiredRole="customer" />
      <ProtectedRoute path="/customer/subscription" component={CustomerSubscriptionSelection} requiredRole="customer" />
      <ProtectedRoute path="/customer/address" component={CustomerAddressSelection} requiredRole="customer" />
      <ProtectedRoute path="/customer/payment" component={CustomerPaymentOptions} requiredRole="customer" />
      <ProtectedRoute path="/customer/checkout" component={CustomerCheckout} requiredRole="customer" />
      <ProtectedRoute path="/customer/subscribe" component={CustomerSubscribe} requiredRole="customer" />
      
      {/* Technician Routes */}
      <ProtectedRoute path="/technician" component={TechnicianJobs} requiredRole="technician" />
      <ProtectedRoute path="/technician/dashboard" component={TechnicianDashboard} requiredRole="technician" />
      <ProtectedRoute path="/technician/jobs" component={TechnicianJobs} requiredRole="technician" />
      <ProtectedRoute path="/technician/job/:id" component={TechnicianJobDetails} requiredRole="technician" />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} requiredRole="admin" />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} requiredRole="admin" />
      <ProtectedRoute path="/admin/subscriptions" component={AdminSubscriptions} requiredRole="admin" />
      <ProtectedRoute path="/admin/jobs" component={AdminJobs} requiredRole="admin" />
      <ProtectedRoute path="/admin/technicians" component={AdminTechnicians} requiredRole="admin" />
      <ProtectedRoute path="/admin/payments" component={AdminPayments} requiredRole="admin" />
      <ProtectedRoute path="/admin/reports" component={AdminReports} requiredRole="admin" />
      <ProtectedRoute path="/admin/settings" component={AdminSettings} requiredRole="admin" />
      
      {/* Auth page - not protected */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Fallback to 404 */}
      <Route path="/:rest*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
