import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  trend?: string;
  trendLabel?: string;
  description?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  trend,
  trendLabel,
  description
}: StatsCardProps) {
  const trendIsPositive = trend && trend.startsWith('+');
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-3xl font-bold mt-1">{value}</h3>
        </div>
        <div className={`p-3 ${iconBgColor} rounded-md ${iconColor}`}>
          {icon}
        </div>
      </div>
      
      {(trend || description) && (
        <div className="mt-4 text-sm">
          {trend && (
            <span className={trendIsPositive ? "text-green-500" : "text-red-500"}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`inline-block h-4 w-4 ${trendIsPositive ? "" : "rotate-180"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg> {trend}
            </span>
          )}
          
          {trendLabel && (
            <span className="text-gray-500 ml-1">{trendLabel}</span>
          )}
          
          {description && !trend && (
            <span className="text-gray-500">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
