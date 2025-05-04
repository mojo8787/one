import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Download, Calendar, Users, Home, CreditCard, LineChart, BarChart, PieChart, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';

const AdminReports = () => {
  // Revenue statistics
  const { data: payments } = useQuery<any[]>({
    queryKey: ["/api/payments"],
  });

  // Jobs statistics
  const { data: jobs } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  // Subscriptions statistics
  const { data: subscriptions } = useQuery<any[]>({
    queryKey: ["/api/subscriptions"],
  });

  // Customers statistics
  const { data: customers } = useQuery<any[]>({
    queryKey: ["/api/users", { role: "customer" }],
  });

  const handleExport = () => {
    alert("Exporting report... (This is a placeholder)")
  };

  // Calculate total revenue
  const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  
  // Calculate active subscriptions
  const activeSubscriptions = subscriptions?.filter(sub => sub.status === 'active').length || 0;
  
  // Calculate recently completed jobs
  const completedJobs = jobs?.filter(job => job.status === 'completed').length || 0;
  
  // Calculate total customers
  const totalCustomers = customers?.length || 0;

  // Calculate monthly revenue data for chart
  const currentMonth = new Date().getMonth();
  const monthlyRevenue = Array(6).fill(0).map((_, i) => {
    const month = (currentMonth - 5 + i + 12) % 12;
    const monthPayments = payments?.filter(payment => {
      const paymentDate = new Date(payment.created_at);
      return paymentDate.getMonth() === month;
    }) || [];
    return {
      month: new Date(2023, month, 1).toLocaleString('default', { month: 'short' }),
      revenue: monthPayments.reduce((sum, payment) => sum + payment.amount, 0)
    };
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600">View key metrics and business insights</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary-dark"
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4" /> Export Report
        </Button>
      </div>

      {/* Key metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue} JOD</div>
            <p className="text-xs text-gray-500 mt-1">+12% from last month</p>
          </CardContent>
          <CardFooter className="pt-0">
            <CreditCard className="h-8 w-8 text-primary opacity-50" />
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-gray-500 mt-1">+5 new this month</p>
          </CardContent>
          <CardFooter className="pt-0">
            <LineChart className="h-8 w-8 text-primary opacity-50" />
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobs}</div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Calendar className="h-8 w-8 text-primary opacity-50" />
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-gray-500 mt-1">+3 new this week</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Users className="h-8 w-8 text-primary opacity-50" />
          </CardFooter>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>View your revenue over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-end justify-between space-x-2">
                {monthlyRevenue.map((data, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="bg-primary rounded-t w-16" 
                      style={{
                        height: `${Math.max(35, (data.revenue / (Math.max(...monthlyRevenue.map(d => d.revenue)) || 1)) * 200)}px`,
                      }}
                    ></div>
                    <div className="text-xs font-medium mt-2">{data.month}</div>
                    <div className="text-xs text-gray-500">{data.revenue} JOD</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Distribution</CardTitle>
                <CardDescription>Payment methods used by customers</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center p-6">
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full border-8 border-primary"></div>
                    <div className="mt-2 font-medium">Card</div>
                    <div className="text-sm text-gray-500">85%</div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full border-8 border-gray-300"></div>
                    <div className="mt-2 font-medium">Cash</div>
                    <div className="text-sm text-gray-500">15%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest payment activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments?.slice(0, 5).map((payment, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <div className="font-medium">Payment #{payment.id}</div>
                        <div className="text-sm text-gray-500">
                          {payment.created_at ? format(new Date(payment.created_at), 'MMM dd, yyyy') : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${payment.status === 'successful' ? 'text-green-600' : 'text-red-600'}`}>
                          {payment.amount} JOD
                        </div>
                        <div className="text-xs uppercase">{payment.method}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Jobs by Status</CardTitle>
              <CardDescription>Current status of all maintenance jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center space-x-8 py-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{jobs?.filter(job => job.status === 'scheduled').length || 0}</div>
                  <div className="text-sm mt-1">Scheduled</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">{jobs?.filter(job => job.status === 'en_route').length || 0}</div>
                  <div className="text-sm mt-1">En Route</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500">{jobs?.filter(job => job.status === 'arrived').length || 0}</div>
                  <div className="text-sm mt-1">Arrived</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">{jobs?.filter(job => job.status === 'completed').length || 0}</div>
                  <div className="text-sm mt-1">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500">{jobs?.filter(job => job.status === 'cancelled').length || 0}</div>
                  <div className="text-sm mt-1">Cancelled</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Jobs by Type</CardTitle>
                <CardDescription>Distribution of job types</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center p-6">
                <div className="flex items-center justify-around space-x-4 w-full">
                  <div className="flex flex-col items-center">
                    <Home className="w-10 h-10 text-primary mb-2" />
                    <div className="text-2xl font-bold">{jobs?.filter(job => job.type === 'installation').length || 0}</div>
                    <div className="text-sm text-gray-500">Installations</div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <ArrowUpDown className="w-10 h-10 text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">{jobs?.filter(job => job.type === 'filter_change').length || 0}</div>
                    <div className="text-sm text-gray-500">Filter Changes</div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <PieChart className="w-10 h-10 text-yellow-500 mb-2" />
                    <div className="text-2xl font-bold">{jobs?.filter(job => job.type === 'repair').length || 0}</div>
                    <div className="text-sm text-gray-500">Repairs</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Jobs</CardTitle>
                <CardDescription>Jobs scheduled in the next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobs
                    ?.filter(job => {
                      const jobDate = new Date(job.scheduledFor);
                      const today = new Date();
                      const nextWeek = new Date(today);
                      nextWeek.setDate(today.getDate() + 7);
                      return jobDate >= today && jobDate <= nextWeek && job.status === 'scheduled';
                    })
                    .slice(0, 5)
                    .map((job, i) => (
                      <div key={i} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <div className="font-medium capitalize">
                            {job.type.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {job.scheduledFor ? format(new Date(job.scheduledFor), 'MMM dd, yyyy - HH:mm') : ''}
                          </div>
                        </div>
                        <div className="px-2 py-1 rounded text-xs uppercase bg-blue-100 text-blue-800">
                          {job.status}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Growth</CardTitle>
              <CardDescription>New customer acquisition trend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-end justify-between space-x-2">
                {Array(6).fill(0).map((_, index) => {
                  const month = (new Date().getMonth() - 5 + index + 12) % 12;
                  const height = Math.floor(Math.random() * 100) + 50;
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="bg-primary rounded-t w-16" 
                        style={{ height: `${height}px` }}
                      ></div>
                      <div className="text-xs font-medium mt-2">
                        {new Date(2023, month, 1).toLocaleString('default', { month: 'short' })}
                      </div>
                      <div className="text-xs text-gray-500">{Math.floor(height / 10)} customers</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Regional Distribution</CardTitle>
                <CardDescription>Customer distribution by location</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>Amman</div>
                    <div className="w-1/2 bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                    <div>70%</div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>Zarqa</div>
                    <div className="w-1/2 bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                    <div>15%</div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>Irbid</div>
                    <div className="w-1/2 bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                    <div>10%</div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>Others</div>
                    <div className="w-1/2 bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '5%' }}></div>
                    </div>
                    <div>5%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Retention</CardTitle>
                <CardDescription>Customer retention statistics</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center p-6">
                <div className="relative w-40 h-40">
                  <div className="w-40 h-40 rounded-full border-8 border-primary"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="text-3xl font-bold">85%</div>
                    <div className="text-sm">Retention Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminReports;