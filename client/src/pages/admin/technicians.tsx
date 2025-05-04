import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  User as UserIcon, 
  Mail, 
  Phone, 
  CalendarCheck,
  Pencil,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function AdminTechnicians() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddingTechnician, setIsAddingTechnician] = useState(false);
  const [newTechnician, setNewTechnician] = useState({
    email: "",
    phone: "",
    username: "",
    password: ""
  });

  // Get all technicians
  const { data: technicians, isLoading } = useQuery<User[]>({
    queryKey: ["/api/technicians"],
    enabled: !!user && user.role === 'admin',
  });

  // Get all jobs to count completed jobs
  const { data: jobs } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    enabled: !!user && user.role === 'admin',
  });

  // Count completed jobs per technician in the last week
  const getCompletedJobsCount = (technicianId: number) => {
    if (!jobs) return 0;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return jobs.filter(job => 
      job.technicianId === technicianId && 
      job.status === 'completed' && 
      new Date(job.updated_at || job.created_at) >= oneWeekAgo
    ).length;
  };

  // Create technician mutation
  const createTechnicianMutation = useMutation({
    mutationFn: async (technicianData: typeof newTechnician) => {
      try {
        const res = await apiRequest("POST", "/api/technicians", technicianData);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to create technician");
        }
        return await res.json();
      } catch (error) {
        console.error("Technician creation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      setIsAddingTechnician(false);
      setNewTechnician({
        email: "",
        phone: "",
        username: "",
        password: ""
      });
      toast({
        title: "Technician Added",
        description: "New technician has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Adding Technician",
        description: error.message || "Failed to add technician",
        variant: "destructive",
      });
    },
  });

  const handleAddTechnician = () => {
    // Simple validation
    if (!newTechnician.email || !newTechnician.phone || !newTechnician.username || !newTechnician.password) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    
    createTechnicianMutation.mutate(newTechnician);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Technicians</h1>
          <p className="text-gray-600">Manage maintenance staff</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary-dark"
          onClick={() => setIsAddingTechnician(!isAddingTechnician)}
        >
          <Plus className="mr-1 h-4 w-4" /> Add Technician
        </Button>
      </div>

      {/* Add Technician Dialog */}
      <Dialog open={isAddingTechnician} onOpenChange={setIsAddingTechnician}>
        <DialogContent className="sm:max-w-[500px]" aria-describedby="technician-dialog-description">
          <DialogHeader>
            <DialogTitle>Add New Technician</DialogTitle>
            <DialogDescription id="technician-dialog-description">
              Create a new technician account to manage maintenance jobs.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={newTechnician.username}
                onChange={(e) => setNewTechnician({...newTechnician, username: e.target.value})}
                placeholder="technician1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newTechnician.email}
                onChange={(e) => setNewTechnician({...newTechnician, email: e.target.value})}
                placeholder="tech@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={newTechnician.phone}
                onChange={(e) => setNewTechnician({...newTechnician, phone: e.target.value})}
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newTechnician.password}
                onChange={(e) => setNewTechnician({...newTechnician, password: e.target.value})}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddingTechnician(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddTechnician}
              disabled={createTechnicianMutation.isPending}
            >
              {createTechnicianMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Technician"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Technicians Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians && technicians.length > 0 ? (
            technicians.map((technician) => (
              <div key={technician.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 bg-secondary/10 border-b flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-white">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-800">{technician.username}</h3>
                    <p className="text-sm text-gray-600">
                      {technician.id === 1 ? 'Senior Technician' : 'Technician'}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <div className="flex items-center text-gray-600 mb-1 text-sm">
                      <Mail className="w-6 flex-shrink-0" />
                      <span>{technician.email}</span>
                    </div>
                    <div className="flex items-center text-gray-600 mb-1 text-sm">
                      <Phone className="w-6 flex-shrink-0" />
                      <span>{technician.phone}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <CalendarCheck className="w-6 flex-shrink-0" />
                      <span>{getCompletedJobsCount(technician.id)} jobs completed this week</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex-1 border-secondary text-secondary hover:bg-secondary hover:text-white">
                      <Pencil className="mr-1 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                      <AlertTriangle className="mr-1 h-4 w-4" /> Disable
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-10 text-gray-500">
              <p>No technicians found. Add your first technician to get started.</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
