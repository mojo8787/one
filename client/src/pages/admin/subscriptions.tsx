import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Pagination } from "@/components/admin/pagination";
import { User, Subscription } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Download,
  Filter,
  Search,
  User as UserIcon,
  Plus
} from "lucide-react";
import { format } from "date-fns";

export default function AdminSubscriptions() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Get all subscriptions
  const { data: subscriptions, isLoading } = useQuery<(Subscription & { user?: User })[]>({
    queryKey: ["/api/subscriptions"],
    enabled: !!user && user.role === 'admin',
  });

  // Filter subscriptions based on search and filters
  const filteredSubscriptions = subscriptions?.filter(subscription => {
    const matchesSearch = 
      !searchTerm || 
      subscription.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = 
      cityFilter === "all" || 
      subscription.user?.city?.toLowerCase() === cityFilter.toLowerCase();
    
    const matchesStatus = 
      statusFilter === "all" || 
      subscription.status === statusFilter;
    
    return matchesSearch && matchesCity && matchesStatus;
  }) || [];

  // Get cities for filter
  const cities = subscriptions
    ? [...new Set(subscriptions.filter(sub => sub.user?.city).map(sub => sub.user?.city))]
    : [];

  // Paginate subscriptions
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle export
  const handleExport = () => {
    // Logic to export as CSV
    const headers = ["Customer", "Email", "Plan", "Status", "Next Payment", "Location"];
    const data = filteredSubscriptions.map(sub => [
      sub.user?.username || 'Unknown',
      sub.user?.email || 'Unknown',
      `Basic Plan - ${sub.planPrice} JOD/month`,
      sub.status.charAt(0).toUpperCase() + sub.status.slice(1),
      sub.nextPaymentDate ? format(new Date(sub.nextPaymentDate), 'MMM d, yyyy') : 'N/A',
      sub.user?.city || 'Unknown'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'subscriptions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Subscriptions</h1>
          <p className="text-gray-600">Manage active subscriptions</p>
        </div>
        <Button className="bg-primary hover:bg-primary-dark">
          <Plus className="mr-1 h-4 w-4" /> Add New
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
          <div className="flex-grow">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input 
                placeholder="Search subscriptions..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city, index) => (
                  <SelectItem key={index} value={city || "unknown"}>
                    {city || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="payment_failed">Payment Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="icon" variant="outline">
            <Filter className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="outline" onClick={handleExport}>
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Subscriptions Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSubscriptions.length > 0 ? (
                    paginatedSubscriptions.map((subscription) => (
                      <tr key={subscription.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <UserIcon className="h-5 w-5" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{subscription.user?.username || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{subscription.user?.email || 'Unknown'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Basic Plan</div>
                          <div className="text-sm text-gray-500">{subscription.planPrice} JOD/month</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${subscription.status === 'active' ? 'bg-green-100 text-green-800' : 
                              subscription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              subscription.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1).replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscription.nextPaymentDate 
                            ? format(new Date(subscription.nextPaymentDate), 'MMM d, yyyy') 
                            : 'Not scheduled'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscription.user?.city || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button variant="link" className="text-primary hover:text-primary-dark">Edit</Button>
                          <Button variant="link" className="text-gray-600 hover:text-gray-900 ml-2">View</Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No subscriptions found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 flex items-center justify-between border-t">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, filteredSubscriptions.length)}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, filteredSubscriptions.length)}</span> of <span className="font-medium">{filteredSubscriptions.length}</span> results
              </div>
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredSubscriptions.length}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
