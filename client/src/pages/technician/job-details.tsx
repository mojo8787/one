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
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Car,
  CheckCircle,
  CheckCircle2,
  ArrowLeft,
  Phone,
  Wrench,
  Droplet,
  ShowerHead,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UpdateJobForm } from "@/components/technician/update-job-form";
import { useRoute, Link } from "wouter";

export default function TechnicianJobDetails() {
  const [_match, params] = useRoute("/technician/job/:id");
  const jobId = params?.id ? parseInt(params.id) : null;
  
  const [updateJobDialogOpen, setUpdateJobDialogOpen] = useState(false);
  
  // Get job details
  const { data: job, isLoading } = useQuery<Job>({
    queryKey: [`/api/jobs/${jobId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!jobId,
  });

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
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}`] });
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
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Link href="/technician/jobs">
            <Button variant="ghost" size="sm" className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Jobs
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : job ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Job #{job.id}</h1>
                <p className="text-gray-500">
                  {job.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
              <Badge className={`text-sm py-1 px-3 ${
                job.status === "completed" ? "bg-green-100 text-green-800 hover:bg-green-100" :
                job.status === "cancelled" ? "bg-red-100 text-red-800 hover:bg-red-100" :
                job.status === "en_route" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" :
                job.status === "arrived" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
                "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }`}>
                {job.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Job Details */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Job Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Service Type</p>
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-1.5 rounded-full mr-2">
                          {getJobTypeIcon(job.type)}
                        </div>
                        <p className="font-medium">
                          {job.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Customer</p>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-500 mr-2" />
                        <p className="font-medium">Customer #{job.userId}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Scheduled Date</p>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                        <p>{new Date(job.scheduledFor).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Scheduled Time</p>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-500 mr-2" />
                        <p>
                          {new Date(job.scheduledFor).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                          {new Date(job.scheduledEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                      <p>{job.address}</p>
                    </div>
                  </div>

                  {job.notes && (
                    <div className="pt-2">
                      <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                      <p className="text-sm bg-gray-50 p-3 rounded-md">{job.notes}</p>
                    </div>
                  )}

                  {job.photoProof && (
                    <div className="pt-2">
                      <p className="text-sm font-medium text-gray-500 mb-1">Photo Proof</p>
                      <div className="max-w-xs overflow-hidden rounded-md border border-gray-200">
                        <img 
                          src={job.photoProof} 
                          alt="Photo proof" 
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  {job.status === "scheduled" && (
                    <Button 
                      variant="default" 
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
                      className="flex items-center bg-green-600 hover:bg-green-700"
                      onClick={() => setUpdateJobDialogOpen(true)}
                      disabled={updateJobMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Complete Job
                    </Button>
                  )}
                  
                  <Button variant="outline" className="flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    Call Customer
                  </Button>
                </CardFooter>
              </Card>

              {/* Location Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-gray-400" />
                    <span className="ml-2 text-gray-500">Map View</span>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" className="w-full">Open in Maps</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-xl font-medium">Job not found</p>
              <p className="text-sm text-gray-500">The requested job could not be found</p>
              <Link href="/technician/jobs">
                <Button className="mt-4">View All Jobs</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Job Completion Dialog */}
      {job && (
        <Dialog open={updateJobDialogOpen} onOpenChange={setUpdateJobDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Job</DialogTitle>
              <DialogDescription>
                Please fill in the details to mark this job as completed.
              </DialogDescription>
            </DialogHeader>
            
            <UpdateJobForm 
              job={job} 
              onSubmit={(data) => {
                handleStatusUpdate(job, "completed");
              }}
              isSubmitting={updateJobMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </TechnicianLayout>
  );
}