import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Subscription } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ChevronLeft, CreditCard, Calendar, AlertCircle, RefreshCw, PauseCircle, Ban, Pencil } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ManageSubscription() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pauseDuration, setPauseDuration] = useState("1");
  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [selectedInterval, setSelectedInterval] = useState("month");
  const [cancelReason, setCancelReason] = useState("");
  const [billingCycleDialogOpen, setBillingCycleDialogOpen] = useState(false);

  // Get user subscription
  const { data: subscription, isLoading } = useQuery<Subscription>({
    queryKey: ["/api/subscriptions/me"],
    enabled: !!user,
  });

  // Mutation for updating subscription
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: Partial<Subscription>) => {
      if (!subscription) throw new Error("No subscription found");
      const res = await apiRequest("PATCH", "/api/subscriptions/me", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
      toast({
        title: "Subscription updated",
        description: "Your subscription has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for pausing subscription
  const pauseSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("No subscription found");
      
      // Calculate resume date based on pause duration
      const resumeDate = new Date();
      resumeDate.setMonth(resumeDate.getMonth() + parseInt(pauseDuration));
      
      const res = await apiRequest("PATCH", "/api/subscriptions/me", { 
        status: "paused",
        pausedUntil: resumeDate.toISOString(),
      });
      return await res.json();
    },
    onSuccess: () => {
      setPauseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
      toast({
        title: "Subscription paused",
        description: `Your subscription has been paused for ${pauseDuration} month${parseInt(pauseDuration) > 1 ? 's' : ''}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to pause",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for cancelling subscription
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("No subscription found");
      const res = await apiRequest("PATCH", "/api/subscriptions/me", { 
        status: "cancelled",
        cancelReason,
      });
      return await res.json();
    },
    onSuccess: () => {
      setCancelDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled. You'll have access until the end of your current billing period.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for upgrading/changing plan
  const changePlanMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("No subscription found");
      const planPrice = selectedPlan === "premium" ? 35 : 25; // Basic is 25, Premium is 35
      
      const res = await apiRequest("POST", "/api/subscriptions/change-plan", { 
        plan: selectedPlan
      });
      return await res.json();
    },
    onSuccess: () => {
      setUpgradeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
      toast({
        title: "Plan updated",
        description: `Your subscription has been changed to the ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Plan change failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for changing billing cycle
  const changeBillingCycleMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("No subscription found");
      const res = await apiRequest("PATCH", "/api/subscriptions/me", { 
        interval: selectedInterval
      });
      return await res.json();
    },
    onSuccess: () => {
      setBillingCycleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
      toast({
        title: "Billing cycle updated",
        description: `Your billing cycle has been changed to ${selectedInterval}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating payment method
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (cardDetails: {type: string, last4: string}) => {
      if (!subscription) throw new Error("No subscription found");
      const res = await apiRequest("POST", "/api/subscriptions/update-payment", { 
        cardType: cardDetails.type,
        cardLast4: cardDetails.last4,
      });
      return await res.json();
    },
    onSuccess: () => {
      setPaymentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
      toast({
        title: "Payment method updated",
        description: "Your payment method has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Format subscription status
  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700">Pending</Badge>;
      case "paused":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Paused</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">Cancelled</Badge>;
      case "payment_failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700">Payment Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Mock function to update payment method (in a real app, this would open Stripe)  
  const handleUpdatePayment = () => {
    // In a real app, this would integrate with Stripe to update payment method
    updatePaymentMethodMutation.mutate({
      type: "Visa",
      last4: "4242"
    });
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  if (!subscription) {
    return (
      <CustomerLayout>
        <div className="p-4">
          <div className="flex items-center mb-4">
            <Button variant="ghost" onClick={() => navigate("/customer/dashboard")} className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Manage Subscription</h1>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
              <CardDescription>You don't have an active subscription plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">To get started with our water filtration services, you need to select a subscription plan.</p>
              <Button onClick={() => navigate("/customer/subscription")}>
                Choose a Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={() => navigate("/customer/dashboard")} className="mr-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Manage Subscription</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          {/* Subscription Overview - 4 columns */}
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle>Your PureFlow Subscription</CardTitle>
              <CardDescription>
                {getSubscriptionStatusBadge(subscription.status)}
                <span className="ml-2">
                  {subscription.status === "paused" && subscription.pausedUntil && 
                    `Resumes on ${format(new Date(subscription.pausedUntil), "MMMM d, yyyy")}`}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current Plan */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Current Plan</h3>
                    <Button variant="outline" size="sm" onClick={() => setUpgradeDialogOpen(true)}>
                      Change Plan
                    </Button>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold">${subscription.planPrice}</span>
                    <span className="text-gray-500 ml-1">/{subscription.interval || "month"}</span>
                  </div>
                  <p className="text-gray-600 mt-1">
                    PureFlow {subscription.plan ? (subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)) : "Basic"} Plan
                  </p>
                  <div className="text-sm text-gray-500 mt-2">
                    {subscription.plan && subscription.plan === "premium" ? (
                      <ul className="list-disc list-inside">
                        <li>Advanced 5-stage filtration</li>
                        <li>Quarterly filter replacements</li>
                        <li>Water quality monitoring</li>
                        <li>Priority technical support</li>
                      </ul>
                    ) : (
                      <ul className="list-disc list-inside">
                        <li>Standard 3-stage filtration</li>
                        <li>Biannual filter replacements</li>
                        <li>Basic technical support</li>
                      </ul>
                    )}
                  </div>
                </div>

                {/* Billing Information */}
                <div>
                  <h3 className="font-semibold mb-2">Billing Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Billing cycle</div>
                    <div className="font-medium text-right flex items-center justify-end">
                      <span className="mr-2">{subscription.interval ? `${subscription.interval.charAt(0).toUpperCase() + subscription.interval.slice(1)}ly` : "Monthly"}</span>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setBillingCycleDialogOpen(true)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="text-gray-500">Next billing date</div>
                    <div className="font-medium text-right">
                      {subscription.nextPaymentDate 
                        ? format(new Date(subscription.nextPaymentDate), "MMMM d, yyyy")
                        : "Not available"}
                    </div>
                    
                    <div className="text-gray-500">Payment method</div>
                    <div className="font-medium text-right flex items-center justify-end">
                      {subscription.cardType && subscription.cardLast4 ? (
                        <>
                          <CreditCard className="h-4 w-4 mr-1" />
                          {subscription.cardType} •••• {subscription.cardLast4}
                        </>
                      ) : (
                        "Not available"
                      )}
                    </div>
                    
                    <div className="text-gray-500">Subscription start date</div>
                    <div className="font-medium text-right">
                      {subscription.created_at 
                        ? format(new Date(subscription.created_at), "MMMM d, yyyy")
                        : "Not available"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                onClick={() => setPaymentDialogOpen(true)}
                className="w-full mb-2">
                <CreditCard className="mr-2 h-4 w-4" />
                Update Payment Method
              </Button>
              
              {subscription.status === "active" && (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button 
                    variant="outline" 
                    className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                    onClick={() => setPauseDialogOpen(true)}>
                    <PauseCircle className="mr-2 h-4 w-4" />
                    Pause Subscription
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setCancelDialogOpen(true)}>
                    <Ban className="mr-2 h-4 w-4" />
                    Cancel Subscription
                  </Button>
                </div>
              )}
              
              {subscription.status === "paused" && (
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => updateSubscriptionMutation.mutate({ status: "active" })}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resume Subscription
                </Button>
              )}
              
              {subscription.status === "cancelled" && (
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => updateSubscriptionMutation.mutate({ status: "active", cancelReason: null })}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reactivate Subscription
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Subscription Management Options - 3 columns */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Notifications & Preferences</CardTitle>
              <CardDescription>Manage your subscription preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-renewal">Auto-renewal</Label>
                    <p className="text-sm text-gray-500">Automatically renew your subscription</p>
                  </div>
                  <Switch id="auto-renewal" defaultChecked={true} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email notifications</Label>
                    <p className="text-sm text-gray-500">Receive emails about upcoming filter changes</p>
                  </div>
                  <Switch id="email-notifications" defaultChecked={true} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-notifications">SMS notifications</Label>
                    <p className="text-sm text-gray-500">Receive text messages for important updates</p>
                  </div>
                  <Switch id="sms-notifications" defaultChecked={true} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pause Subscription Dialog */}
        <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pause Your Subscription</DialogTitle>
              <DialogDescription>
                Your subscription will be temporarily paused. You won't be charged during this period, but you also won't receive services.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pause Duration</Label>
                <Select value={pauseDuration} onValueChange={setPauseDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="2">2 months</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPauseDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => pauseSubscriptionMutation.mutate()}
                disabled={pauseSubscriptionMutation.isPending}>                
                {pauseSubscriptionMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  "Pause Subscription"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Subscription Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Your Subscription</DialogTitle>
              <DialogDescription>
                We're sorry to see you go. Your subscription will remain active until the end of the current billing period.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason for cancellation</Label>
                <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="too_expensive" id="too_expensive" />
                    <Label htmlFor="too_expensive">Too expensive</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_satisfied" id="not_satisfied" />
                    <Label htmlFor="not_satisfied">Not satisfied with the service</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no_longer_needed" id="no_longer_needed" />
                    <Label htmlFor="no_longer_needed">No longer need the service</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moving" id="moving" />
                    <Label htmlFor="moving">Moving to a new location</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other">Other reason</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Subscription</Button>
              <Button 
                variant="destructive" 
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}>
                {cancelSubscriptionMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  "Confirm Cancellation"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Billing Cycle Dialog */}
        <Dialog open={billingCycleDialogOpen} onOpenChange={setBillingCycleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Billing Cycle</DialogTitle>
              <DialogDescription>
                Choose how often you want to be billed for your subscription.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <RadioGroup value={selectedInterval} onValueChange={setSelectedInterval}>
                <div className="grid gap-4">
                  <div className="relative flex flex-col items-start cursor-pointer rounded-lg border p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between w-full">
                      <div>
                        <RadioGroupItem value="month" id="month" className="absolute right-4 top-4" />
                        <div className="flex flex-col mb-2">
                          <span className="font-medium">Monthly</span>
                          <span className="text-primary font-bold text-xl">${subscription?.planPrice}/month</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          You'll be billed every month and can cancel anytime.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="relative flex flex-col items-start cursor-pointer rounded-lg border p-4 hover:bg-gray-50">
                    <div className="absolute -top-2 -right-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Save 10%</div>
                    <div className="flex items-start justify-between w-full">
                      <div>
                        <RadioGroupItem value="year" id="year" className="absolute right-4 top-4" />
                        <div className="flex flex-col mb-2">
                          <span className="font-medium">Yearly</span>
                          <span className="text-primary font-bold text-xl">${Math.floor(subscription?.planPrice * 12 * 0.9)}/year</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Save 10% by paying annually. One payment per year.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBillingCycleDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => changeBillingCycleMutation.mutate()}
                disabled={changeBillingCycleMutation.isPending}>
                {changeBillingCycleMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  "Update Billing Cycle"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Plan Dialog */}
        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Your Subscription Plan</DialogTitle>
              <DialogDescription>
                Select the plan that best fits your needs. Changes will take effect immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                <div className="grid gap-4">
                  <div className="relative flex flex-col items-start cursor-pointer rounded-lg border p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between w-full">
                      <div>
                        <RadioGroupItem value="basic" id="basic" className="absolute right-4 top-4" />
                        <div className="flex flex-col mb-2">
                          <span className="font-medium">Basic Plan</span>
                          <span className="text-primary font-bold text-xl">$25/month</span>
                        </div>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          <li>Standard 3-stage filtration</li>
                          <li>Biannual filter replacements</li>
                          <li>Basic technical support</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="relative flex flex-col items-start cursor-pointer rounded-lg border p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between w-full">
                      <div>
                        <RadioGroupItem value="premium" id="premium" className="absolute right-4 top-4" />
                        <Badge className="absolute right-4 top-10 bg-primary-light text-white">Recommended</Badge>
                        <div className="flex flex-col mb-2">
                          <span className="font-medium">Premium Plan</span>
                          <span className="text-primary font-bold text-xl">$35/month</span>
                        </div>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          <li>Advanced 5-stage filtration</li>
                          <li>Quarterly filter replacements</li>
                          <li>Water quality monitoring</li>
                          <li>Priority technical support</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => changePlanMutation.mutate()}
                disabled={changePlanMutation.isPending}>
                {changePlanMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  "Update Plan"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Payment Method Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Payment Method</DialogTitle>
              <DialogDescription>
                Update your payment information for future billing cycles.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 border rounded-md">
                <p className="text-sm text-gray-500 mb-3">
                  In a production app, this would integrate with Stripe Elements for secure payment collection. For this demo, we'll simulate updating to a new card.
                </p>
                <div className="bg-gray-100 p-3 rounded-md flex items-center mb-3">
                  <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm font-medium">Visa •••• 4242</span>
                </div>
                <p className="text-xs text-gray-400">
                  This is a simulated card for demonstration purposes only.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleUpdatePayment}
                disabled={updatePaymentMethodMutation.isPending}>
                {updatePaymentMethodMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  "Update Payment Method"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CustomerLayout>
  );
}
