import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertJobSchema, type InsertJob, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateJobModal({ isOpen, onClose }: CreateJobModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);

  // Create a schema with some extra validation
  const formSchema = insertJobSchema.extend({
    scheduledFor: insertJobSchema.shape.scheduledFor,
    scheduledEndTime: insertJobSchema.shape.scheduledEndTime,
    technicianId: insertJobSchema.shape.technicianId,
  });

  // Get customers (users with customer role)
  const { data: customers, isLoading: isLoadingCustomers } = useQuery<User[]>({
    queryKey: ["/api/users", "customer"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users?role=customer");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });
  
  // Get technicians
  const { data: technicians, isLoading: isLoadingTechnicians } = useQuery<User[]>({
    queryKey: ["/api/technicians"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/technicians");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      return res.json();
    },
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: InsertJob) => {
      try {
        const res = await apiRequest("POST", "/api/jobs", data);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to create job");
        }
        return res.json();
      } catch (error) {
        console.error("Job creation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set up the form
  const form = useForm<InsertJob>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: 0,
      type: "installation",
      address: "",
      scheduledFor: new Date(),
      scheduledEndTime: new Date(new Date().setHours(new Date().getHours() + 2)), // 2 hours after start
      notes: "",
      technicianId: undefined, // Default no technician selected
      status: "scheduled", // Default status for new jobs
    },
  });

  // Handle form submission
  const onSubmit = async (data: InsertJob) => {
    // Ensure dates are proper Date objects and all required fields are present
    const formattedData = {
      ...data,
      scheduledFor: new Date(data.scheduledFor),
      scheduledEndTime: new Date(data.scheduledEndTime),
      status: "scheduled",
      // Make sure we have a non-empty address
      address: data.address || "No address provided"
    };
    
    // Log the data being sent for debugging
    console.log("Submitting job data:", formattedData);
    
    createJobMutation.mutate(formattedData);
  };

  // Handler for customer selection to auto-fill address
  const handleCustomerChange = (userId: string) => {
    const id = parseInt(userId);
    form.setValue("userId", id);
    
    // Find customer and auto-fill address if available
    const customer = customers?.find(c => c.id === id);
    if (customer) {
      setSelectedCustomer(customer);
      if (customer.address) {
        form.setValue("address", customer.address);
      }
    } else {
      setSelectedCustomer(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]" aria-describedby="job-creation-description">
        <DialogHeader>
          <DialogTitle>Create New Maintenance Job</DialogTitle>
          <p id="job-creation-description" className="text-sm text-muted-foreground">
            Fill out the form below to create a new maintenance job for a customer.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Selection */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select
                    disabled={isLoadingCustomers}
                    onValueChange={handleCustomerChange}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.username || customer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Job Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="installation">Installation</SelectItem>
                      <SelectItem value="filter_change">Filter Change</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduled For (Date & Time) */}
            <FormField
              control={form.control}
              name="scheduledFor"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Scheduled Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => field.onChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const date = new Date(form.getValues('scheduledFor'));
                    date.setHours(parseInt(hours), parseInt(minutes));
                    form.setValue('scheduledFor', date);
                  }}
                  defaultValue={format(form.getValues('scheduledFor'), 'HH:mm')}
                />
              </div>
              
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const date = new Date(form.getValues('scheduledEndTime'));
                    date.setHours(parseInt(hours), parseInt(minutes));
                    form.setValue('scheduledEndTime', date);
                  }}
                  defaultValue={format(form.getValues('scheduledEndTime'), 'HH:mm')}
                />
              </div>
            </div>

            {/* Technician Selection */}
            <FormField
              control={form.control}
              name="technicianId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Technician</FormLabel>
                  <Select
                    disabled={isLoadingTechnicians}
                    onValueChange={(value) => field.onChange(value === 'unassigned' ? undefined : parseInt(value))}
                    value={field.value ? field.value.toString() : 'unassigned'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a technician" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">No technician assigned</SelectItem>
                      {technicians?.map((technician) => (
                        <SelectItem key={technician.id} value={technician.id.toString()}>
                          {technician.username || technician.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes or instructions"
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={createJobMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createJobMutation.isPending}
              >
                {createJobMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Job"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}