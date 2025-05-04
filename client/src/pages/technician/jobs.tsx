import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { TechnicianLayout } from "@/components/layout/technician-layout";
import { Job, UpdateJobStatus } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  CheckCircle,
  CheckCircle2,
  Phone,
  MessageSquare,
  Camera,
  Wrench,
  User,
  Droplet,
  ShowerHead,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UpdateJobForm } from "@/components/technician/update-job-form";

export default function TechnicianJobs() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [updateJobDialogOpen, setUpdateJobDialogOpen] = useState(false);
  
  // Get jobs assigned to this technician
  const { data: myJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs/technician"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Filter jobs by status
  const pendingJobs = myJobs.filter(job => job.status !== "completed" && job.status !== "cancelled");
  const completedJobs = myJobs.filter(job => job.status === "completed");
  
  // Mutation to update job status
  const updateJobMutation = useMutation({
    mutationFn: async (data: UpdateJobStatus) => {
      const response = await apiRequest("PATCH", `/api/jobs/${data.id}/status`, { status: data.status });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job updated",
        description: "The job status has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/technician"] });
      setUpdateJobDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (job: Job, status: "en_route" | "arrived" | "completed") => {
    updateJobMutation.mutate({ id: job.id, status });
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case "installation":
        return <Wrench className="w-5 h-5" />;
      case "filter_change":
        return <Droplet className="w-5 h-5" />;
      case "repair":
        return <ShowerHead className="w-5 h-5" />;
      default:
        return <Wrench className="w-5 h-5" />;
    }
  };

  return (
    <TechnicianLayout>
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-gray-500">Manage your assigned maintenance jobs</p>
        </div>

        {/* Pending Jobs */}
        <div>
          <h2 className="text-xl font-bold mb-4">Pending Jobs</h2>
          {jobsLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : pendingJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingJobs.map((job) => (
                <Card key={job.id} className="overflow-hidden">
                  <div className={`h-1.5 ${
                    job.status === "arrived" ? "bg-blue-500" :
                    job.status === "en_route" ? "bg-yellow-500" :
                    "bg-gray-300"
                  }`} />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-2 rounded-full mr-3">
                          {getJobTypeIcon(job.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{job.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
                          <p className="text-xs text-gray-500">Job #{job.id}</p>
                        </div>
                      </div>
                      <Badge variant={
                        job.status === "en_route" ? "default" :
                        job.status === "arrived" ? "outline" :
                        "secondary"
                      }>
                        {job.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm">
                        {new Date(job.scheduledFor).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm">
                        {new Date(job.scheduledFor).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                        {new Date(job.scheduledEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                      <span className="text-sm">{job.address}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm">Customer #{job.userId}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex flex-wrap gap-2">
                    {job.status === "scheduled" && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex items-center"
                        onClick={() => handleStatusUpdate(job, "en_route")}
                        disabled={updateJobMutation.isPending}
                      >
                        <Car className="w-4 h-4 mr-1" />
                        Start Route
                      </Button>
                    )}
                    
                    {job.status === "en_route" && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex items-center"
                        onClick={() => handleStatusUpdate(job, "arrived")}
                        disabled={updateJobMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Arrived
                      </Button>
                    )}
                    
                    {job.status === "arrived" && (
                      <Button 
                        variant="success" 
                        size="sm" 
                        className="flex items-center bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedJob(job);
                          setUpdateJobDialogOpen(true);
                        }}
                        disabled={updateJobMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Complete Job
                      </Button>
                    )}
                    
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      Call Customer
                    </Button>
                    
                    <Button variant="outline" size="sm" className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-xl font-medium">All caught up!</p>
                <p className="text-sm text-gray-500">You have no pending jobs</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Completed Jobs */}
        <div>
          <h2 className="text-xl font-bold mb-4">Completed Jobs</h2>
          {jobsLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : completedJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedJobs.slice(0, 4).map((job) => (
                <Card key={job.id} className="overflow-hidden">
                  <div className="h-1.5 bg-green-500" />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="bg-green-100 p-2 rounded-full mr-3">
                          {getJobTypeIcon(job.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{job.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
                          <p className="text-xs text-gray-500">Job #{job.id}</p>
                        </div>
                      </div>
                      <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">
                        Completed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm">
                        {new Date(job.scheduledFor).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                      <span className="text-sm">{job.address}</span>
                    </div>
                    {job.photoProof && (
                      <div className="flex items-center">
                        <Camera className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="text-sm text-primary cursor-pointer">View photo proof</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <CheckCircle2 className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-xl font-medium">No completed jobs</p>
                <p className="text-sm text-gray-500">You haven't completed any jobs yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Job Completion Dialog */}
      <Dialog open={updateJobDialogOpen} onOpenChange={setUpdateJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
            <DialogDescription>
              Please fill in the details to mark this job as completed.
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob && (
            <UpdateJobForm 
              job={selectedJob} 
              onSubmit={(data) => {
                handleStatusUpdate(selectedJob, "completed");
              }}
              isSubmitting={updateJobMutation.isPending}
            />
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setUpdateJobDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechnicianLayout>
  );
}