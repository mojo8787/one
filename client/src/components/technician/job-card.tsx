import { Job } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Clock, 
  User, 
  CheckCircle, 
  Navigation, 
  Phone, 
  Play
} from "lucide-react";
import { format } from "date-fns";

interface JobCardProps {
  job: Job & { customer?: any };
  highlighted?: boolean;
  onClick: () => void;
}

export function JobCard({ job, highlighted = false, onClick }: JobCardProps) {
  // Format dates and times
  const formattedDate = format(new Date(job.scheduledFor), 'PPP');
  const startTime = format(new Date(job.scheduledFor), 'h:mm a');
  const endTime = format(new Date(job.scheduledEndTime), 'h:mm a');
  
  // Get job type display text
  const getJobTypeText = (type: string) => {
    switch (type) {
      case 'installation':
        return 'New Installation';
      case 'filter_change':
        return 'Filter Change';
      case 'repair':
        return 'Repair';
      default:
        return 'Maintenance';
    }
  };

  // Get status component
  const StatusBadge = ({ status }: { status: string }) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-700';
    
    switch (status) {
      case 'en_route':
        bgColor = 'bg-primary/20';
        textColor = 'text-primary';
        break;
      case 'arrived':
        bgColor = 'bg-blue-500/20';
        textColor = 'text-blue-500';
        break;
      case 'completed':
        bgColor = 'bg-green-500/20';
        textColor = 'text-green-500';
        break;
      case 'cancelled':
        bgColor = 'bg-red-500/20';
        textColor = 'text-red-500';
        break;
    }
    
    return (
      <span className={`${bgColor} ${textColor} text-xs px-2 py-1 rounded-full`}>
        {status === 'en_route' ? 'En Route' : 
         status === 'arrived' ? 'Arrived' : 
         status === 'completed' ? 'Completed' : 
         status === 'cancelled' ? 'Cancelled' : 'Scheduled'}
      </span>
    );
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md overflow-hidden ${highlighted ? 'border-l-4 border-primary' : ''}`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold">{getJobTypeText(job.type)}</h3>
          <StatusBadge status={job.status} />
        </div>
        <div className="mb-3">
          <div className="flex items-center text-gray-600 mb-1 text-sm">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{job.address}</span>
          </div>
          <div className="flex items-center text-gray-600 mb-1 text-sm">
            <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>{startTime} - {endTime}, {formattedDate}</span>
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <User className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>{job.customer?.username || 'Customer'}</span>
          </div>
        </div>
        <div className="flex space-x-2">
          {job.status === 'scheduled' && (
            <Button 
              className="flex-1 py-2 px-3 bg-secondary text-white rounded-md text-sm"
              onClick={(e) => {
                e.stopPropagation();
                // In a real app, this would dispatch an action to update the job status
              }}
            >
              <Play className="mr-1 h-4 w-4" /> Start Job
            </Button>
          )}
          
          {job.status === 'en_route' && (
            <Button 
              className="flex-1 py-2 px-3 bg-success text-white rounded-md text-sm"
              onClick={(e) => {
                e.stopPropagation();
                // In a real app, this would dispatch an action to update the job status
              }}
            >
              <CheckCircle className="mr-1 h-4 w-4" /> Mark Arrived
            </Button>
          )}
          
          {job.status === 'arrived' && (
            <Button 
              className="flex-1 py-2 px-3 bg-success text-white rounded-md text-sm"
              onClick={(e) => {
                e.stopPropagation();
                // In a real app, this would dispatch an action to update the job status
              }}
            >
              <CheckCircle className="mr-1 h-4 w-4" /> Complete
            </Button>
          )}
          
          {(job.status === 'scheduled' || job.status === 'en_route' || job.status === 'arrived') && (
            <Button 
              variant="outline"
              className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-md text-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (job.addressCoordinates) {
                  const { lat, lng } = job.addressCoordinates;
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                } else {
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`, '_blank');
                }
              }}
            >
              <Navigation className="mr-1 h-4 w-4" /> Navigate
            </Button>
          )}
          
          {(job.status === 'en_route' || job.status === 'arrived') && job.customer?.phone && (
            <Button 
              variant="outline"
              className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-md text-sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${job.customer.phone}`, '_blank');
              }}
            >
              <Phone className="mr-1 h-4 w-4" /> Call
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
