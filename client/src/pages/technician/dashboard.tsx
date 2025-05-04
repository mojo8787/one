import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { TechnicianLayout } from "@/components/layout/technician-layout";
import { Job } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  BarChart3,
  Hourglass,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function TechnicianDashboard() {
  const [todayDate] = useState(() => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  });
  
  // Get jobs assigned to this technician
  const { data: myJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs/technician"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Filter jobs for today
  const todayJobs = myJobs.filter(job => {
    const jobDate = new Date(job.scheduledFor);
    const today = new Date();
    return jobDate.getDate() === today.getDate() &&
           jobDate.getMonth() === today.getMonth() &&
           jobDate.getFullYear() === today.getFullYear();
  });
  
  // Stats for jobs
  const scheduledJobs = myJobs.filter(job => job.status === "scheduled").length;
  const completedJobs = myJobs.filter(job => job.status === "completed").length;
  const totalJobs = myJobs.length;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
  
  // Next job to handle (first scheduled job for today)
  const nextJob = todayJobs.find(job => job.status === "scheduled");

  return (
    <TechnicianLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold">Technician Dashboard</h1>
            <p className="text-gray-500">{todayDate}</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Today's Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-primary mr-2" />
                <div className="text-2xl font-bold">{todayJobs.length}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Hourglass className="w-5 h-5 text-yellow-500 mr-2" />
                <div className="text-2xl font-bold">{scheduledJobs}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-green-500 mr-2" />
                <div className="text-2xl font-bold">{completionRate}%</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Job */}
        <div>
          <h2 className="text-xl font-bold mb-4">Next Appointment</h2>
          {nextJob ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{nextJob.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
                    <CardDescription>Job #{nextJob.id}</CardDescription>
                  </div>
                  <Badge variant={
                    nextJob.status === "completed" ? "success" :
                    nextJob.status === "en_route" ? "default" :
                    nextJob.status === "arrived" ? "outline" :
                    "secondary"
                  }>
                    {nextJob.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm">{nextJob.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Scheduled Time</p>
                      <p className="text-sm">{new Date(nextJob.scheduledFor).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(nextJob.scheduledEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">View Details</Button>
                <Button>Start Job <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-xl font-medium">No pending jobs</p>
                <p className="text-sm text-gray-500">You're all caught up for today!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Today's Schedule */}
        <div>
          <h2 className="text-xl font-bold mb-4">Today's Schedule</h2>
          {todayJobs.length > 0 ? (
            <div className="space-y-4">
              {todayJobs.map((job) => (
                <Card key={job.id} className="overflow-hidden">
                  <div className={`h-1.5 ${
                    job.status === "completed" ? "bg-green-500" :
                    job.status === "arrived" ? "bg-blue-500" :
                    job.status === "en_route" ? "bg-yellow-500" :
                    "bg-gray-300"
                  }`} />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 mt-1">
                          {job.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : job.status === "cancelled" ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{new Date(job.scheduledFor).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          <p className="text-sm text-gray-500">{job.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                          <p className="text-xs text-gray-400 mt-1">{job.address}</p>
                        </div>
                      </div>
                      <Badge variant={
                        job.status === "completed" ? "success" :
                        job.status === "cancelled" ? "destructive" :
                        job.status === "en_route" ? "default" :
                        job.status === "arrived" ? "outline" :
                        "secondary"
                      } className="ml-auto">
                        {job.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-xl font-medium">No jobs scheduled</p>
                <p className="text-sm text-gray-500">You have no appointments for today</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TechnicianLayout>
  );
}