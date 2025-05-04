import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Pagination } from "@/components/admin/pagination";
import { CreateJobModal } from "@/components/admin/create-job-modal";
import { Job, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export default function AdminJobs() {
  const { user } = useAuth();
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Get all jobs
  const { data: jobs, isLoading: isLoadingJobs } = useQuery<(Job & { customer?: User, technician?: User })[]>({
    queryKey: ["/api/jobs"],
    enabled: !!user && user.role === 'admin',
  });

  // Get all technicians
  const { data: technicians, isLoading: isLoadingTechnicians } = useQuery<User[]>({
    queryKey: ["/api/technicians"],
    enabled: !!user && user.role === 'admin',
  });

  // Filter jobs based on filters
  const filteredJobs = jobs?.filter(job => {
    // Date filter
    const jobDate = format(new Date(job.scheduledFor), 'yyyy-MM-dd');
    const matchesDate = !date || jobDate === date;
    
    // Technician filter
    const matchesTechnician = 
      technicianFilter === "all" || 
      (job.technicianId && job.technicianId.toString() === technicianFilter) ||
      (technicianFilter === "unassigned" && !job.technicianId);
    
    // Job type filter
    const matchesType = 
      jobTypeFilter === "all" || 
      job.type === jobTypeFilter;
    
    // Status filter
    const matchesStatus = 
      statusFilter === "all" || 
      job.status === statusFilter;
    
    // Search filter
    const matchesSearch = 
      !searchTerm || 
      job.customer?.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      job.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesDate && matchesTechnician && matchesType && matchesStatus && matchesSearch;
  }) || [];

  // Paginate jobs
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // State for job creation modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Handle job creation
  const handleCreateJob = () => {
    setIsCreateModalOpen(true);
  };

  const isLoading = isLoadingJobs || isLoadingTechnicians;

  return (
    <AdminLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Maintenance Jobs</h1>
          <p className="text-gray-600">Schedule and manage maintenance visits</p>
        </div>
        <Button className="bg-primary hover:bg-primary-dark" onClick={handleCreateJob}>
          <Plus className="mr-1 h-4 w-4" /> Create Job
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="job-date" className="block text-sm font-medium text-gray-700">Date</label>
            <Input
              type="date"
              id="job-date"
              className="mt-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="job-technician" className="block text-sm font-medium text-gray-700">Technician</label>
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger id="job-technician" className="mt-1">
                <SelectValue placeholder="All Technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {technicians?.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id.toString()}>
                    {tech.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="job-type" className="block text-sm font-medium text-gray-700">Job Type</label>
            <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
              <SelectTrigger id="job-type" className="mt-1">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="installation">Installation</SelectItem>
                <SelectItem value="filter_change">Filter Change</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="job-status" className="block text-sm font-medium text-gray-700">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="job-status" className="mt-1">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="en_route">En Route</SelectItem>
                <SelectItem value="arrived">Arrived</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="job-search" className="block text-sm font-medium text-gray-700">Search</label>
            <Input
              type="text"
              id="job-search"
              placeholder="Search by customer or address"
              className="mt-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Jobs Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedJobs.length > 0 ? (
                    paginatedJobs.map((job) => (
                      <tr key={job.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{job.customer?.username || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{job.address}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {job.type === 'installation' ? 'Installation' : 
                             job.type === 'filter_change' ? 'Filter Change' : 
                             job.type === 'repair' ? 'Repair' : 'Maintenance'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{format(new Date(job.scheduledFor), 'PP')}</div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(job.scheduledFor), 'p')} - {format(new Date(job.scheduledEndTime), 'p')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {job.technician ? job.technician.username : 'Unassigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${job.status === 'scheduled' ? 'bg-gray-100 text-gray-800' : 
                              job.status === 'en_route' ? 'bg-primary/10 text-primary' : 
                              job.status === 'arrived' ? 'bg-blue-100 text-blue-800' : 
                              job.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {job.status === 'scheduled' ? 'Scheduled' : 
                             job.status === 'en_route' ? 'En Route' : 
                             job.status === 'arrived' ? 'Arrived' : 
                             job.status === 'completed' ? 'Completed' : 
                             'Cancelled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button variant="link" className="text-primary hover:text-primary-dark">Edit</Button>
                          <Button variant="link" className="text-red-600 hover:text-red-800 ml-2">Cancel</Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No jobs found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 flex items-center justify-between border-t">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, filteredJobs.length)}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, filteredJobs.length)}</span> of <span className="font-medium">{filteredJobs.length}</span> results
              </div>
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredJobs.length}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Create Job Modal */}
      <CreateJobModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </AdminLayout>
  );
}
