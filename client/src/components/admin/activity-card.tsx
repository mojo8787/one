import { ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";

interface ActivityCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  timestamp: string | Date;
}

export function ActivityCard({
  title,
  description,
  icon,
  iconBgColor,
  iconColor,
  timestamp
}: ActivityCardProps) {
  // Format timestamp as relative time (e.g., "2 minutes ago")
  const relativeTime = formatDistanceToNow(
    typeof timestamp === 'string' ? new Date(timestamp) : timestamp,
    { addSuffix: true }
  );
  
  return (
    <div className="flex items-start">
      <div className={`${iconBgColor} ${iconColor} p-2 rounded mr-3 flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-500 mt-1">{relativeTime}</p>
      </div>
    </div>
  );
}
