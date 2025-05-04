import { Check } from "lucide-react";

interface SubscriptionPlanProps {
  price: number;
}

export function SubscriptionPlan({ price }: SubscriptionPlanProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      <div className="bg-primary-light p-4 text-white">
        <h3 className="text-xl font-semibold">Basic Plan</h3>
        <p className="text-sm opacity-90">Monthly filter changes</p>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-3xl font-bold">{price} JOD<span className="text-sm font-normal text-gray-600">/month</span></p>
          <div className="bg-primary text-white text-xs px-2 py-1 rounded">Most Popular</div>
        </div>
        <ul className="space-y-2 mb-4">
          <li className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>Professional installation included</span>
          </li>
          <li className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>Monthly filter replacements</span>
          </li>
          <li className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>24/7 customer support</span>
          </li>
          <li className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>No long-term commitment</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
