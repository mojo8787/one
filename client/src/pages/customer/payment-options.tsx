import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { OnboardingState, Job, Subscription } from "@shared/schema";
import { PaymentOptions } from "@/components/customer/payment-options";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentOptionsPage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [cardDetails, setCardDetails] = useState<{
    last4: string;
    type: string;
  } | null>(null);

  // Get onboarding state
  const { data: onboardingState, isLoading: isLoadingOnboarding } = useQuery<OnboardingState>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  // Get user subscription
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery<Subscription>({
    queryKey: ["/api/subscriptions/me"],
    enabled: !!user,
  });

  // Get installation job
  const { data: jobs, isLoading: isLoadingJobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs/me"],
    enabled: !!user,
  });

  // Redirect if needed
  useEffect(() => {
    if (onboardingState) {
      if (onboardingState.step === 'account') {
        navigate('/customer/onboarding');
      } else if (onboardingState.step === 'plan') {
        navigate('/customer/subscription');
      } else if (onboardingState.step === 'address') {
        navigate('/customer/address');
      } else if (onboardingState.step === 'complete') {
        navigate('/customer/dashboard');
      }
    }
  }, [onboardingState, navigate]);

  // Process payment
  const paymentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        method: paymentMethod,
        cardDetails: paymentMethod === 'card' ? cardDetails : null,
      };
      
      const res = await apiRequest("POST", "/api/payments", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
      toast({
        title: "Payment Successful",
        description: "Your subscription has been activated. Welcome to PureFlow!",
      });
      navigate("/customer/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    navigate("/customer/address");
  };

  const handleCompleteOrder = () => {
    if (paymentMethod === 'card') {
      // For card payments, redirect to Stripe checkout page
      navigate('/customer/subscribe');
    } else if (paymentMethod === 'cash') {
      // For cash payments, use the existing payment flow
      paymentMutation.mutate();
    }
  };

  const isLoading = isLoadingOnboarding || isLoadingSubscription || isLoadingJobs;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Find the installation job
  const installationJob = jobs?.find(job => job.type === 'installation');
  const installationDate = installationJob ? new Date(installationJob.scheduledFor) : null;

  // Calculate tax and total amount
  const planPrice = subscription?.planPrice || 25;
  const taxRate = 0.16; // 16% tax
  const taxAmount = Math.round(planPrice * taxRate);
  const totalAmount = planPrice + taxAmount;

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose Payment Method</h2>
        <p className="text-gray-600">Secure payment for your PureFlow subscription.</p>
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
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-xs mt-1">Plan</span>
        </div>
        <div className="relative flex items-center flex-grow mx-2">
          <div className="h-1 w-full bg-green-500"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-xs mt-1">Address</span>
        </div>
        <div className="relative flex items-center flex-grow mx-2">
          <div className="h-1 w-full bg-green-500"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">4</div>
          <span className="text-xs mt-1">Payment</span>
        </div>
      </div>

      {/* Payment Methods */}
      <PaymentOptions 
        selectedMethod={paymentMethod}
        onMethodChange={setPaymentMethod}
        onCardDetailsChange={setCardDetails}
      />

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow-md p-4 mt-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Order Summary</h3>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Monthly Subscription</span>
            <span>{planPrice.toFixed(2)} JOD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Installation Fee</span>
            <span>0.00 JOD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax (16%)</span>
            <span>{taxAmount.toFixed(2)} JOD</span>
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>{totalAmount.toFixed(2)} JOD</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mb-4">
          <p>
            {installationDate 
              ? `Your installation is scheduled for ${installationDate.toLocaleDateString()} at ${installationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
              : 'Your installation date will be confirmed shortly.'}
          </p>
          <p className="mt-1">Your subscription will renew automatically each month.</p>
        </div>
      </div>

      <div className="mt-6 flex space-x-4">
        <Button variant="outline" className="flex-1" onClick={handleBack}>
          Back
        </Button>
        <Button 
          className="flex-1" 
          onClick={handleCompleteOrder}
          disabled={paymentMutation.isPending}
        >
          {paymentMutation.isPending ? "Processing..." : "Complete Order"}
        </Button>
      </div>
    </div>
  );
}
