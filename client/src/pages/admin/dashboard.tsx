import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { StatsCard } from "@/components/admin/stats-card";
import { ActivityCard } from "@/components/admin/activity-card";
import { User, Subscription, Job, Payment } from "@shared/schema";
import { 
  Users, DollarSign, CalendarCheck, UserPlus,
  CheckCircle, AlertCircle, Clock, UserMinus
} from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { user } = useAuth();

  // Get all subscriptions
  const { data: subscriptions } = useQuery<(Subscription & { user?: User })[]>({
    queryKey: ["/api/subscriptions"],
    enabled: !!user && user.role === 'admin',
  });

  // Get all jobs
  const { data: jobs } = useQuery<(Job & { customer?: User, technician?: User })[]>({
    queryKey: ["/api/jobs"],
    enabled: !!user && user.role === 'admin',
  });

  // Get all payments
  const { data: payments } = useQuery<(Payment & { user?: User })[]>({
    queryKey: ["/api/payments"],
    enabled: !!user && user.role === 'admin',
  });

  // Get all technicians
  const { data: technicians } = useQuery<User[]>({
    queryKey: ["/api/technicians"],
    enabled: !!user && user.role === 'admin',
  });

  // Calculate dashboard stats
  const totalSubscribers = subscriptions?.length || 0;
  
  const monthlyRevenue = payments
    ?.filter(payment => payment.status === 'successful')
    .reduce((sum, payment) => sum + payment.amount, 0) || 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const jobsToday = jobs?.filter(job => {
    const jobDate = new Date(job.scheduledFor);
    jobDate.setHours(0, 0, 0, 0);
    return jobDate.getTime() === today.getTime();
  }) || [];
  
  const completedJobsToday = jobsToday.filter(job => job.status === 'completed').length;
  
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const newSubscribersThisMonth = subscriptions?.filter(sub => {
    const createdDate = new Date(sub.created_at);
    return createdDate > lastMonth;
  }).length || 0;

  // Recent activity
  const recentActivity = [
    // New subscriptions
    ...(subscriptions
      ?.filter(sub => sub.status === 'active' || sub.status === 'pending')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map(sub => ({
        type: 'subscription',
        title: 'New subscription',
        description: `${sub.user?.username || 'A customer'} subscribed to the Basic Plan`,
        icon: <UserPlus />,
        iconBgColor: 'bg-primary/10',
        iconColor: 'text-primary',
        date: sub.created_at
      })) || []),
    
    // Completed jobs
    ...(jobs
      ?.filter(job => job.status === 'completed')
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 3)
      .map(job => ({
        type: 'job_completed',
        title: 'Job completed',
        description: `Technician ${job.technician?.username || 'unknown'} completed ${job.type.replace('_', ' ')}`,
        icon: <CheckCircle />,
        iconBgColor: 'bg-green-500/10',
        iconColor: 'text-green-500',
        date: job.updated_at || job.created_at
      })) || []),
    
    // Failed payments
    ...(payments
      ?.filter(payment => payment.status === 'failed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2)
      .map(payment => ({
        type: 'payment_failed',
        title: 'Payment failed',
        description: `${payment.user?.username || 'A customer'}'s payment was declined`,
        icon: <AlertCircle />,
        iconBgColor: 'bg-red-500/10',
        iconColor: 'text-red-500',
        date: payment.created_at
      })) || []),
    
    // Rescheduled jobs
    ...(jobs
      ?.filter(job => job.status === 'scheduled' && job.updated_at)
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 2)
      .map(job => ({
        type: 'job_rescheduled',
        title: 'Job rescheduled',
        description: `Maintenance for ${job.customer?.username || 'customer'} rescheduled`,
        icon: <Clock />,
        iconBgColor: 'bg-amber-500/10',
        iconColor: 'text-amber-500',
        date: job.updated_at || job.created_at
      })) || []),
  ];

  // Sort by date
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Today's jobs for the right panel
  const todaysJobs = jobsToday
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .map(job => ({
      id: job.id,
      customer: job.customer?.username || 'Customer',
      type: job.type === 'installation' ? 'New Installation' : 
            job.type === 'filter_change' ? 'Filter Change' : 
            job.type === 'repair' ? 'Repair' : 'Maintenance',
      time: format(new Date(job.scheduledFor), 'h:mm a'),
      status: job.status
    }));

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Overview of PureFlow operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Total Subscribers"
          value={totalSubscribers}
          icon={<Users />}
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
          trend={"+12%"}
          trendLabel="from last month"
        />
        
        <StatsCard
          title="Monthly Revenue"
          value={`${monthlyRevenue} JOD`}
          icon={<DollarSign />}
          iconBgColor="bg-green-500/10"
          iconColor="text-green-500"
          trend={"+8%"}
          trendLabel="from last month"
        />
        
        <StatsCard
          title="Jobs Today"
          value={jobsToday.length}
          icon={<CalendarCheck />}
          iconBgColor="bg-secondary/10"
          iconColor="text-secondary"
          description={`${completedJobsToday} completed, ${jobsToday.length - completedJobsToday} pending`}
        />
        
        <StatsCard
          title="New Subscribers"
          value={newSubscribersThisMonth}
          icon={<UserPlus />}
          iconBgColor="bg-accent/10"
          iconColor="text-accent"
          trend={"+24%"}
          trendLabel="from last week"
        />
      </div>

      {/* Recent Activity and Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800">Recent Activity</h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {recentActivity.slice(0, 4).map((activity, index) => (
                <ActivityCard 
                  key={index}
                  title={activity.title}
                  description={activity.description}
                  icon={activity.icon}
                  iconBgColor={activity.iconBgColor}
                  iconColor={activity.iconColor}
                  timestamp={activity.date}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Today's Jobs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Today's Jobs</h2>
            <a href="/admin/jobs" className="text-primary text-sm">View All</a>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {todaysJobs.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No jobs scheduled for today
                </div>
              ) : (
                todaysJobs.map((job) => (
                  <div key={job.id} className="flex justify-between items-center pb-2 border-b">
                    <div>
                      <p className="font-medium">{job.customer}</p>
                      <p className="text-sm text-gray-600">{job.type} • {job.time}</p>
                    </div>
                    <div className="flex items-center">
                      <span className={`
                        text-xs px-2 py-1 rounded-full mr-2
                        ${job.status === 'scheduled' ? 'bg-gray-100 text-gray-600' : 
                          job.status === 'en_route' ? 'bg-primary text-white' : 
                          job.status === 'arrived' ? 'bg-blue-500 text-white' :
                          job.status === 'completed' ? 'bg-green-500 text-white' : 
                          'bg-red-500 text-white'}
                      `}>
                        {job.status === 'scheduled' ? 'Scheduled' : 
                         job.status === 'en_route' ? 'En Route' : 
                         job.status === 'arrived' ? 'Arrived' :
                         job.status === 'completed' ? 'Completed' : 
                         'Cancelled'}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Trend and Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Trend */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800">Subscription Growth</h2>
          </div>
          <div className="p-4 h-64 flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24">
              <line x1="22" y1="12" x2="2" y2="12" />
              <polyline points="5.45 5.11 2 12 5.45 18.89" />
              <polyline points="18.55 5.11 22 12 18.55 18.89" />
              <line x1="6" y1="7" x2="6" y2="17" />
              <line x1="10" y1="3" x2="10" y2="21" />
              <line x1="14" y1="5" x2="14" y2="19" />
              <line x1="18" y1="7" x2="18" y2="17" />
            </svg>
          </div>
        </div>

        {/* Coverage Map */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800">Customer Map</h2>
          </div>
          <div className="p-4 h-64 flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
