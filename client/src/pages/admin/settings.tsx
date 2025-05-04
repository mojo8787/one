import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Check } from "lucide-react";

const AdminSettings = () => {
  const { toast } = useToast();
  const [planPrice, setPlanPrice] = useState<number>(25); // Default value
  const [filterChangeInterval, setFilterChangeInterval] = useState<number>(6); // Default 6 months
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [smsNotifications, setSmsNotifications] = useState<boolean>(false);
  
  // Get settings from API
  const { isLoading } = useQuery<any>({
    queryKey: ["/api/settings"],
    onSuccess: (data) => {
      if (data) {
        setPlanPrice(parseFloat(data.plan_price) || 25);
        setFilterChangeInterval(parseInt(data.filter_change_interval) || 6);
        setNotificationsEnabled(data.notifications_enabled !== "false");
        setEmailNotifications(data.email_notifications !== "false");
        setSmsNotifications(data.sms_notifications === "true");
      }
    },
  });

  // Update plan price mutation
  const updatePlanPrice = useMutation({
    mutationFn: async (price: number) => {
      const res = await apiRequest("POST", "/api/settings/plan-price", { price });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Plan price has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generic settings update mutation
  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("POST", "/api/settings", { key, value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSavePlanPrice = () => {
    updatePlanPrice.mutate(planPrice);
  };

  const handleSaveFilterInterval = () => {
    updateSetting.mutate({ key: "filter_change_interval", value: filterChangeInterval.toString() });
  };

  const handleSaveNotificationSettings = () => {
    Promise.all([
      updateSetting.mutate({ key: "notifications_enabled", value: notificationsEnabled.toString() }),
      updateSetting.mutate({ key: "email_notifications", value: emailNotifications.toString() }),
      updateSetting.mutate({ key: "sms_notifications", value: smsNotifications.toString() }),
    ]);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
        <p className="text-gray-600">Configure your PureFlow system preferences</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage the basic system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" value="PureFlow Water Filter Systems" disabled />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Input id="timezone" value="Amman (GMT+2)" disabled />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value="JOD" disabled />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>
                System Settings are currently read-only
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Manage your subscription plan settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="plan-price">Monthly Plan Price (JOD)</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="plan-price" 
                    type="number" 
                    value={planPrice} 
                    onChange={(e) => setPlanPrice(parseFloat(e.target.value))} 
                  />
                  <Button 
                    onClick={handleSavePlanPrice}
                    disabled={updatePlanPrice.isPending}
                  >
                    {updatePlanPrice.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="filter-change">Filter Change Interval (months)</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="filter-change" 
                    type="number" 
                    value={filterChangeInterval} 
                    onChange={(e) => setFilterChangeInterval(parseInt(e.target.value))} 
                  />
                  <Button 
                    onClick={handleSaveFilterInterval}
                    disabled={updateSetting.isPending}
                  >
                    {updateSetting.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how and when notifications are sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">System Notifications</Label>
                  <p className="text-sm text-gray-500">Enable or disable all notifications</p>
                </div>
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Send notifications via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  disabled={!notificationsEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-gray-500">Send notifications via SMS</p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={smsNotifications}
                  onCheckedChange={setSmsNotifications}
                  disabled={!notificationsEnabled}
                />
              </div>

              <Button 
                onClick={handleSaveNotificationSettings}
                disabled={updateSetting.isPending}
                className="mt-4"
              >
                {updateSetting.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Notification Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>View system status and information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">System Version</p>
                  <p className="text-sm text-gray-500">1.0.0</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Database Status</p>
                  <p className="text-sm text-green-500 flex items-center">
                    <Check className="mr-1 h-3 w-3" /> Connected
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Last Backup</p>
                  <p className="text-sm text-gray-500">Never</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Payment System</p>
                  <p className="text-sm text-green-500 flex items-center">
                    <Check className="mr-1 h-3 w-3" /> Active
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" disabled>
                Run System Backup
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;