import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Pagination } from "@/components/admin/pagination";
import { User, Payment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { StatsCard } from "@/components/admin/stats-card";
import {
  Download,
  CreditCard,
  DollarSign,
  Clock,
  AlertTriangle,
  BarChart,
  Settings
} from "lucide-react";
import { format } from "date-fns";

export default function AdminPayments() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Get all payments
  const { data: payments, isLoading } = useQuery<(Payment & { user?: User })[]>({
    queryKey: ["/api/payments"],
    enabled: !!user && user.role === 'admin',
  });

  // Filter payments based on filters
  const filteredPayments = payments?.filter(payment => {
    // Date filter
    const paymentDate = new Date(payment.created_at);
    const matchesFromDate = !fromDate || paymentDate >= new Date(fromDate);
    const matchesToDate = !toDate || paymentDate <= new Date(toDate + 'T23:59:59');
    
    // Status filter
    const matchesStatus = 
      statusFilter === "all" || 
      payment.status === statusFilter;
    
    // Method filter
    const matchesMethod = 
      methodFilter === "all" || 
      payment.method === methodFilter;
    
    // Search filter
    const matchesSearch = 
      !searchTerm || 
      payment.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFromDate && matchesToDate && matchesStatus && matchesMethod && matchesSearch;
  }) || [];

  // Paginate payments
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate stats
  const monthlyRevenue = payments
    ?.filter(payment => payment.status === 'successful')
    .reduce((sum, payment) => sum + payment.amount, 0) || 0;
  
  const pendingPaymentsAmount = payments
    ?.filter(payment => payment.status === 'pending')
    .reduce((sum, payment) => sum + payment.amount, 0) || 0;
  
  const failedPaymentsAmount = payments
    ?.filter(payment => payment.status === 'failed')
    .reduce((sum, payment) => sum + payment.amount, 0) || 0;
  
  const averageSubscription = monthlyRevenue / (payments?.filter(payment => payment.status === 'successful').length || 1);

  // Handle export
  const handleExport = () => {
    // Logic to export as CSV
    const headers = ["Transaction ID", "Customer", "Email", "Date", "Amount", "Method", "Status"];
    const data = filteredPayments.map(payment => [
      payment.transactionId || '',
      payment.user?.username || 'Unknown',
      payment.user?.email || 'Unknown',
      format(new Date(payment.created_at), 'PPP'),
      `${payment.amount.toFixed(2)} JOD`,
      payment.method === 'card' ? `${payment.cardType || 'Card'} •••• ${payment.cardLast4 || '****'}` : 'Cash',
      payment.status.charAt(0).toUpperCase() + payment.status.slice(1)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'payments.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <p className="text-gray-600">Track all financial transactions</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            className="bg-primary hover:bg-primary-dark"
            onClick={handleExport}
          >
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" className="bg-gray-100 hover:bg-gray-200 text-gray-700">
            <Settings className="mr-1 h-4 w-4" /> Settings
          </Button>
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Monthly Revenue"
          value={`${monthlyRevenue.toFixed(2)} JOD`}
          icon={<DollarSign />}
          iconBgColor="bg-green-500/10"
          iconColor="text-green-500"
        />
        
        <StatsCard
          title="Pending Payments"
          value={`${pendingPaymentsAmount.toFixed(2)} JOD`}
          icon={<Clock />}
          iconBgColor="bg-amber-500/10"
          iconColor="text-amber-500"
        />
        
        <StatsCard
          title="Failed Payments"
          value={`${failedPaymentsAmount.toFixed(2)} JOD`}
          icon={<AlertTriangle />}
          iconBgColor="bg-red-500/10"
          iconColor="text-red-500"
        />
        
        <StatsCard
          title="Average Subscription"
          value={`${isNaN(averageSubscription) ? '0.00' : averageSubscription.toFixed(2)} JOD`}
          icon={<BarChart />}
          iconBgColor="bg-blue-500/10"
          iconColor="text-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700">From</label>
            <Input
              type="date"
              id="date-from"
              className="mt-1"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700">To</label>
            <Input
              type="date"
              id="date-to"
              className="mt-1"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="payment-status" className="block text-sm font-medium text-gray-700">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="payment-status" className="mt-1">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="successful">Successful</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">Method</label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger id="payment-method" className="mt-1">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="payment-search" className="block text-sm font-medium text-gray-700">Search</label>
            <Input
              type="text"
              id="payment-search"
              placeholder="Search by customer or transaction ID"
              className="mt-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedPayments.length > 0 ? (
                    paginatedPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{payment.transactionId || `TRX-${payment.id}`}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{payment.user?.username || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{payment.user?.email || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{format(new Date(payment.created_at), 'PP')}</div>
                          <div className="text-sm text-gray-500">{format(new Date(payment.created_at), 'p')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.amount.toFixed(2)} JOD
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            {payment.method === 'card' ? (
                              <>
                                <CreditCard className="mr-2 h-4 w-4 text-blue-500" />
                                {payment.cardType || 'Card'} •••• {payment.cardLast4 || '****'}
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-green-500">
                                  <path d="M2 14h20l-2 7H4l-2-7Z" />
                                  <path d="M7 14V5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v9" />
                                </svg>
                                Cash
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${payment.status === 'successful' ? 'bg-green-100 text-green-800' : 
                              payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button variant="link" className="text-primary hover:text-primary-dark">Receipt</Button>
                          <Button variant="link" className="text-gray-600 hover:text-gray-900 ml-2">Details</Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No payments found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 flex items-center justify-between border-t">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, filteredPayments.length)}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, filteredPayments.length)}</span> of <span className="font-medium">{filteredPayments.length}</span> results
              </div>
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredPayments.length}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
