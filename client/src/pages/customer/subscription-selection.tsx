import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { OnboardingState } from "@shared/schema";

// Components
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";
import { SubscriptionPlan } from "@/components/customer/subscription-plan";

export default function SubscriptionSelection() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Get onboarding state
  const { data: onboardingState, isLoading } = useQuery<OnboardingState>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  // Get plan price
  const { data: planPrice } = useQuery<{ price: number }>({
    queryKey: ["/api/plan-price"],
  });

  // Redirect if needed
  useEffect(() => {
    if (onboardingState) {
      if (onboardingState.step === 'account') {
        navigate('/customer/onboarding');
      } else if (onboardingState.step === 'address') {
        navigate('/customer/address');
      } else if (onboardingState.step === 'payment') {
        navigate('/customer/payment');
      } else if (onboardingState.step === 'complete') {
        navigate('/customer/dashboard');
      }
    }
  }, [onboardingState, navigate]);

  // Create subscription and update onboarding state
  const mutation = useMutation({
    mutationFn: async () => {
      // First create subscription
      await apiRequest("POST", "/api/subscriptions", {});
      
      // Then update onboarding state
      const res = await apiRequest("POST", "/api/onboarding", { 
        step: 'address',
        planSelected: true,
        termsAccepted,
      });
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      navigate("/customer/address");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    navigate("/customer/onboarding");
  };

  const handleNext = () => {
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Select Your Plan</h2>
        <p className="text-gray-600">Choose the best filter solution for your home.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between mb-8">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-xs mt-1">Account</span>
        </div>
        <div className="relative flex items-center flex-grow mx-2">
          <div className="h-1 w-full bg-green-500"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">2</div>
          <span className="text-xs mt-1">Plan</span>
        </div>
        <div className="relative flex items-center flex-grow mx-2">
          <div className="h-1 w-full bg-gray-200">
            <div className="h-1 bg-primary" style={{width: "0%"}}></div>
          </div>
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

      {/* Subscription Plan */}
      <SubscriptionPlan price={planPrice?.price || 25} />

      {/* Terms and Privacy */}
      <div className="mt-4">
        <div className="flex items-start">
          <Checkbox 
            id="terms" 
            checked={termsAccepted} 
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} 
            className="h-4 w-4 mt-1"
          />
          <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
            I agree to the <a href="#" className="text-primary">Terms of Service</a> and <a href="#" className="text-primary">Privacy Policy</a>
          </label>
        </div>
      </div>

      <div className="mt-6 flex space-x-4">
        <Button variant="outline" className="flex-1" onClick={handleBack}>
          Back
        </Button>
        <Button 
          className="flex-1" 
          onClick={handleNext}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Processing..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
