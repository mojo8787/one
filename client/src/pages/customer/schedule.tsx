import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { useAuth } from "@/hooks/use-auth";
import { Job } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Clock, MapPin, Wrench, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function CustomerSchedule() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get user jobs
  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs/me"],
    enabled: !!user,
  });

  // Filter jobs by selected date
  const filteredJobs = jobs?.filter(job => {
    if (!selectedDate) return true;
    const jobDate = new Date(job.scheduledFor);
    return (
      jobDate.getDate() === selectedDate.getDate() &&
      jobDate.getMonth() === selectedDate.getMonth() &&
      jobDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Get upcoming jobs
  const upcomingJobs = jobs?.filter(job => {
    const jobDate = new Date(job.scheduledFor);
    const today = new Date();
    return jobDate > today;
  }).sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  // Get past jobs
  const pastJobs = jobs?.filter(job => {
    const jobDate = new Date(job.scheduledFor);
    const today = new Date();
    return jobDate < today || job.status === "completed";
  }).sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());

  // Function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Scheduled</Badge>;
      case "en_route":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700">Technician En Route</Badge>;
      case "arrived":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700">Technician Arrived</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Function to get job type icon
  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case "installation":
        return <Wrench className="h-4 w-4 mr-1" />;
      case "filter_change":
        return <AlertCircle className="h-4 w-4 mr-1" />;
      case "repair":
        return <Wrench className="h-4 w-4 mr-1" />;
      default:
        return <CalendarIcon className="h-4 w-4 mr-1" />;
    }
  };

  // Function to format job type text
  const formatJobType = (type: string) => {
    switch (type) {
      case "installation":
        return "Installation";
      case "filter_change":
        return "Filter Change";
      case "repair":
        return "Repair";
      default:
        return type;
    }
  };

  return (
    <CustomerLayout>
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-500">Filter by date:</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[240px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="space-y-4">
              {selectedDate ? (
                <div className="mt-4">
                  <h2 className="text-lg font-medium mb-2">
                    Jobs on {format(selectedDate, "MMMM d, yyyy")}
                  </h2>
                  {filteredJobs && filteredJobs.length > 0 ? (
                    filteredJobs.map((job) => (
                      <Card key={job.id} className="mb-4">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between">
                            <CardTitle className="text-lg flex items-center">
                              {getJobTypeIcon(job.type)} {formatJobType(job.type)}
                            </CardTitle>
                            {getStatusBadge(job.status)}
                          </div>
                          <CardDescription>
                            Job #{job.id}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              <span>
                                {format(new Date(job.scheduledFor), "MMMM d, yyyy")}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>
                                {format(new Date(job.scheduledFor), "h:mm a")} - 
                                {format(new Date(job.scheduledEndTime), "h:mm a")}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{job.address}</span>
                            </div>
                            {job.notes && (
                              <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
                                <p className="font-medium">Notes:</p>
                                <p>{job.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs scheduled</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        You don't have any jobs scheduled for this date.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  {upcomingJobs && upcomingJobs.length > 0 ? (
                    upcomingJobs.map((job) => (
                      <Card key={job.id} className="mb-4">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between">
                            <CardTitle className="text-lg flex items-center">
                              {getJobTypeIcon(job.type)} {formatJobType(job.type)}
                            </CardTitle>
                            {getStatusBadge(job.status)}
                          </div>
                          <CardDescription>
                            Job #{job.id}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              <span>
                                {format(new Date(job.scheduledFor), "MMMM d, yyyy")}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>
                                {format(new Date(job.scheduledFor), "h:mm a")} - 
                                {format(new Date(job.scheduledEndTime), "h:mm a")}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{job.address}</span>
                            </div>
                            {job.notes && (
                              <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
                                <p className="font-medium">Notes:</p>
                                <p>{job.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming jobs</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        You don't have any upcoming maintenance or service jobs scheduled.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past" className="space-y-4">
              {pastJobs && pastJobs.length > 0 ? (
                pastJobs.map((job) => (
                  <Card key={job.id} className="mb-4">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-lg flex items-center">
                          {getJobTypeIcon(job.type)} {formatJobType(job.type)}
                        </CardTitle>
                        {getStatusBadge(job.status)}
                      </div>
                      <CardDescription>
                        Job #{job.id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          <span>
                            {format(new Date(job.scheduledFor), "MMMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>
                            {format(new Date(job.scheduledFor), "h:mm a")} - 
                            {format(new Date(job.scheduledEndTime), "h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{job.address}</span>
                        </div>
                        {job.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
                            <p className="font-medium">Notes:</p>
                            <p>{job.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No past jobs</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any completed maintenance or service jobs.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </CustomerLayout>
  );
}
