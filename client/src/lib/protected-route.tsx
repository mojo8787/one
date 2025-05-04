import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

// Role-based protected route
export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: {
  path: string;
  component: React.ComponentType;
  requiredRole?: "customer" | "technician" | "admin";
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If a specific role is required, check for it
  if (requiredRole && user.role !== requiredRole) {
    return (
      <Route path={path}>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-700 mb-6">
              You don't have permission to access this page. This page requires {requiredRole} privileges.
            </p>
            <div className="flex justify-between">
              <button 
                onClick={() => window.history.back()} 
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
              <a 
                href="/" 
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
