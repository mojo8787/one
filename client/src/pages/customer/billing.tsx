import { useQuery } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { useAuth } from "@/hooks/use-auth";
import { Payment, Subscription } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Calendar, FileText, Download, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function CustomerBilling() {
  const { user } = useAuth();

  // Get user subscription
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery<Subscription>({
    queryKey: ["/api/subscriptions/me"],
    enabled: !!user,
  });

  // Get user payments
  const { data: payments, isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments/me"],
    enabled: !!user,
  });

  const isLoading = isLoadingSubscription || isLoadingPayments;

  // Format subscription status
  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700">Pending</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">Cancelled</Badge>;
      case "payment_failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700">Payment Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format payment status
  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "successful":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Calendar className="h-5 w-5 text-amber-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <CustomerLayout>
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-bold">Billing & Payments</h1>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Subscription Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Subscription</CardTitle>
                <CardDescription>Your current subscription plan and billing information</CardDescription>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">PureFlow {subscription.plan || 'Basic'} Plan</h3>
                        <p className="text-sm text-gray-500">
                          {getSubscriptionStatusBadge(subscription.status)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${subscription.price ? subscription.price.toFixed(2) : '0.00'}</p>
                        <p className="text-sm text-gray-500">per {subscription.interval || 'month'}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Next billing date</span>
                        <span className="font-medium">
                          {subscription.nextPaymentDate ? format(new Date(subscription.nextPaymentDate), "MMMM d, yyyy") : "Not available"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-500">Payment method</span>
                        <span className="font-medium flex items-center">
                          <CreditCard className="h-4 w-4 mr-1" />
                          {subscription.paymentMethod || "Not available"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-500">Start date</span>
                        <span className="font-medium">
                          {subscription.created_at ? format(new Date(subscription.created_at), "MMMM d, yyyy") : "Not available"}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-4">
                      <Button variant="outline" className="text-sm">
                        Update Payment Method
                      </Button>
                      <Button variant="outline" className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50">
                        Cancel Subscription
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No active subscription</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You don't have an active subscription plan yet.
                    </p>
                    <div className="mt-6">
                      <Button>
                        Choose a Plan
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Payment History</CardTitle>
                <CardDescription>Your recent payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {payments && payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Receipt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.sort((a, b) => {
                        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                        return dateB - dateA;
                      })
                        .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.created_at ? format(new Date(payment.created_at), "MMM d, yyyy") : "N/A"}
                          </TableCell>
                          <TableCell>
                            {`PureFlow ${subscription?.plan || 'Basic'} Plan`}
                          </TableCell>
                          <TableCell>${payment.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getPaymentStatusIcon(payment.status)}
                              <span className="ml-2 capitalize">{payment.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {payment.status === "successful" && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Download</span>
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No payment history</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You don't have any payment transactions yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
