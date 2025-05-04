import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { OnboardingState, Address, InstallationDate } from "@shared/schema";

// Components
import { Button } from "@/components/ui/button";
import { AddressForm } from "@/components/customer/address-form";
import { CalendarPicker } from "@/components/customer/calendar-picker";
import { Check } from "lucide-react";

export default function AddressSelection() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [address, setAddress] = useState<Address | null>(null);
  const [installationDate, setInstallationDate] = useState<InstallationDate | null>(null);

  // Get onboarding state
  const { data: onboardingState, isLoading } = useQuery<OnboardingState>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  // Redirect if needed
  useEffect(() => {
    if (onboardingState) {
      if (onboardingState.step === 'account') {
        navigate('/customer/onboarding');
      } else if (onboardingState.step === 'plan') {
        navigate('/customer/subscription');
      } else if (onboardingState.step === 'payment') {
        navigate('/customer/payment');
      } else if (onboardingState.step === 'complete') {
        navigate('/customer/dashboard');
      }
    }
  }, [onboardingState, navigate]);

  // Save address and installation date
  const addressMutation = useMutation({
    mutationFn: async () => {
      if (!address) return null;
      const res = await apiRequest("POST", "/api/address", address);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Address Saved",
        description: "Your address has been saved successfully.",
      });
      
      // Now schedule installation if we have a date
      if (installationDate) {
        scheduleMutation.mutate();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save address",
        variant: "destructive",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!installationDate) return null;
      const res = await apiRequest("POST", "/api/schedule-installation", installationDate);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      navigate("/customer/payment");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule installation",
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    navigate("/customer/subscription");
  };

  const handleNext = () => {
    if (!address) {
      toast({
        title: "Address Required",
        description: "Please enter your address to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!installationDate) {
      toast({
        title: "Installation Date Required",
        description: "Please select an installation date and time to continue.",
        variant: "destructive",
      });
      return;
    }

    // First save address, then schedule installation
    addressMutation.mutate();
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Installation Address</h2>
        <p className="text-gray-600">Where should we install your PureFlow system?</p>
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
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">3</div>
          <span className="text-xs mt-1">Address</span>
        </div>
        <div className="relative flex items-center flex-grow mx-2">
          <div className="h-1 w-full bg-gray-200">
            <div className="h-1 bg-primary" style={{width: "0%"}}></div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">4</div>
          <span className="text-xs mt-1">Payment</span>
        </div>
      </div>

      {/* Address Form */}
      <AddressForm onAddressChange={setAddress} />

      {/* Calendar Picker for Installation Date */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Select Installation Date</h3>
        <CalendarPicker onDateTimeSelect={setInstallationDate} />
      </div>

      <div className="mt-6 flex space-x-4">
        <Button variant="outline" className="flex-1" onClick={handleBack}>
          Back
        </Button>
        <Button 
          className="flex-1" 
          onClick={handleNext}
          disabled={addressMutation.isPending || scheduleMutation.isPending}
        >
          {addressMutation.isPending || scheduleMutation.isPending ? "Processing..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
