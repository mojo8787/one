import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Job, Payment, Subscription } from "@shared/schema";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Button } from "@/components/ui/button";
import { 
  CalendarCheck, 
  CreditCard, 
  CheckCircle2, 
  MessageSquare, 
  Phone,
  MapPin,
  Clock,
  User,
  ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  // Get user subscription
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery<Subscription>({
    queryKey: ["/api/subscriptions/me"],
    enabled: !!user,
  });

  // Get user jobs
  const { data: jobs, isLoading: isLoadingJobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs/me"],
    enabled: !!user,
  });

  // Get user payments
  const { data: payments, isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments/me"],
    enabled: !!user,
  });

  // Check if onboarding is complete
  useEffect(() => {
    if (user && !isLoadingSubscription && !subscription) {
      // If user has no subscription, redirect to onboarding
      navigate("/customer/onboarding");
    }
  }, [user, subscription, isLoadingSubscription, navigate]);

  const isLoading = isLoadingSubscription || isLoadingJobs || isLoadingPayments;

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </CustomerLayout>
    );
  }

  // Find next filter change job
  const nextFilterChange = jobs
    ?.filter(job => job.type === 'filter_change' && job.status !== 'completed' && job.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];

  // Get subscription status
  const subscriptionStatus = subscription?.status || 'pending';
  const nextPaymentDate = subscription?.nextPaymentDate 
    ? new Date(subscription.nextPaymentDate) 
    : null;
  
  const lastPayment = payments && payments.length > 0
    ? payments
      .sort((a, b) => {
        // Safely handle null dates
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })[0]
    : null;
  
  return (
    <CustomerLayout>
      <div className="bg-white shadow-sm mb-4">
        <div className="p-4">
          <h2 className="text-xl font-semibold text-gray-800">Hello, {user?.username}</h2>
          <p className="text-gray-600">Welcome to your PureFlow dashboard</p>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Subscription Status */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-primary-light text-white">
            <h3 className="font-semibold">Your Subscription</h3>
          </div>
          <div className="p-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Status</span>
              <span className={`font-medium ${
                subscriptionStatus === 'active' ? 'text-green-500' : 
                subscriptionStatus === 'pending' ? 'text-amber-500' : 
                subscriptionStatus === 'cancelled' ? 'text-gray-500' : 'text-red-500'
              }`}>
                {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Plan</span>
              <span className="font-medium">Basic - {subscription?.planPrice} JOD/month</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Next Payment</span>
              <span className="font-medium">
                {nextPaymentDate 
                  ? format(nextPaymentDate, 'MMMM d, yyyy')
                  : 'Not scheduled yet'}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium">
                {lastPayment?.method === 'card' && lastPayment.cardType && lastPayment.cardLast4
                  ? `${lastPayment.cardType} •••• ${lastPayment.cardLast4}`
                  : lastPayment?.method === 'cash'
                  ? 'Cash'
                  : 'Not set'}
              </span>
            </div>
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full text-primary border-primary hover:bg-primary-light hover:text-white"
                onClick={() => navigate("/customer/manage-subscription")}
              >
                Manage Subscription
              </Button>
            </div>
          </div>
        </div>

        {/* Next Service */}
        {nextFilterChange && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-secondary-light text-white">
              <h3 className="font-semibold">Next Filter Change</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center mb-4">
                <CalendarCheck className="mr-3 text-xl text-secondary" />
                <div>
                  <div className="font-medium">
                    {format(new Date(nextFilterChange.scheduledFor), 'MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(nextFilterChange.scheduledFor), 'h:mm a')} - {format(new Date(nextFilterChange.scheduledEndTime), 'h:mm a')}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button className="flex-1 bg-secondary hover:bg-secondary-dark">
                  Reschedule
                </Button>
                <Button variant="outline" className="flex-1">
                  Directions
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Service History */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-800">Service History</h3>
          </div>
          <div className="divide-y">
            {jobs && jobs.length > 0 ? (
              jobs
                .filter(job => job.status === 'completed')
                .sort((a, b) => {
                  const dateA = new Date(a.updated_at || a.created_at || Date.now()).getTime();
                  const dateB = new Date(b.updated_at || b.created_at || Date.now()).getTime();
                  return dateB - dateA;
                })
                .slice(0, 5)
                .map(job => (
                  <div key={job.id} className="p-4 flex items-center">
                    <div className="flex-grow">
                      <div className="font-medium">
                        {job.type === 'installation' ? 'Filter Installation' :
                         job.type === 'filter_change' ? 'Filter Change' : 
                         job.type === 'repair' ? 'System Repair' : 'Maintenance'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(job.updated_at || job.created_at || Date.now()), 'MMMM d, yyyy')}
                      </div>
                    </div>
                    <div>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Completed
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No service history yet
              </div>
            )}
          </div>
        </div>

        {/* Support */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-800">Need Help?</h3>
          </div>
          <div className="p-4">
            <Button variant="outline" className="w-full bg-gray-100 hover:bg-gray-200 mb-2 text-left flex items-center justify-start">
              <MessageSquare className="mr-3 text-gray-600" />
              <span>Chat with Support</span>
            </Button>
            <Button variant="outline" className="w-full bg-gray-100 hover:bg-gray-200 text-left flex items-center justify-start">
              <Phone className="mr-3 text-gray-600" />
              <span>Call Us: +962 6 123 4567</span>
            </Button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
