import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { OnboardingState } from "@shared/schema";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SwatchBook } from "lucide-react";

export default function CustomerOnboarding() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // Get onboarding state
  const { data: onboardingState, isLoading } = useQuery<OnboardingState>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  // Redirect if needed
  useEffect(() => {
    if (onboardingState) {
      if (onboardingState.step !== 'account') {
        // If user has already completed this step, redirect to the next step
        if (onboardingState.step === 'plan') {
          navigate('/customer/subscription');
        } else if (onboardingState.step === 'address') {
          navigate('/customer/address');
        } else if (onboardingState.step === 'payment') {
          navigate('/customer/payment');
        } else if (onboardingState.step === 'complete') {
          navigate('/customer/dashboard');
        }
      }
    }
  }, [onboardingState, navigate]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding", { step: 'plan' });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      navigate("/customer/subscription");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <SwatchBook className="h-6 w-6 text-primary mr-2" />
          <h2 className="text-2xl font-bold text-gray-800">Welcome to PureFlow</h2>
        </div>
        <p className="text-gray-600">Clean, pure water delivered to your home.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between mb-8">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">1</div>
          <span className="text-xs mt-1">Account</span>
        </div>
        <div className="relative flex items-center flex-grow mx-2">
          <div className="h-1 w-full bg-gray-200">
            <div className="h-1 bg-primary" style={{width: "25%"}}></div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">2</div>
          <span className="text-xs mt-1">Plan</span>
        </div>
        <div className="relative flex items-center flex-grow mx-2">
          <div className="h-1 w-full bg-gray-200"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">3</div>
          <span className="text-xs mt-1">Address</span>
        </div>
        <div className="relative flex items-center flex-grow mx-2">
          <div className="h-1 w-full bg-gray-200"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">4</div>
          <span className="text-xs mt-1">Payment</span>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Your Account Details</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone</span>
            <span className="font-medium">{user?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Account Created</span>
            <span className="font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Today'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
        <p className="text-gray-600 mb-4">
          Now let's select your subscription plan and schedule your filter installation.
        </p>
        <Button 
          className="w-full" 
          onClick={handleContinue}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Processing..." : "Continue to Plan Selection"}
        </Button>
      </div>
    </div>
  );
}
