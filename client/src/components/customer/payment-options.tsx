import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote } from "lucide-react";

interface PaymentOptionsProps {
  selectedMethod: 'card' | 'cash';
  onMethodChange: (method: 'card' | 'cash') => void;
  onCardDetailsChange: (details: { last4: string; type: string; } | null) => void;
}

export function PaymentOptions({ 
  selectedMethod, 
  onMethodChange,
  onCardDetailsChange
}: PaymentOptionsProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardFormVisible, setCardFormVisible] = useState(true);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  // Format expiry date as MM/YY
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    
    return v;
  };

  // Handle card number input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCardNumber(e.target.value);
    setCardNumber(formattedValue);
    
    // Extract last 4 digits and determine card type
    if (formattedValue.replace(/\s/g, "").length >= 16) {
      const digits = formattedValue.replace(/\s/g, "");
      const last4 = digits.substring(digits.length - 4);
      let type = "Card";
      
      // Simple card type detection
      if (digits.startsWith("4")) {
        type = "Visa";
      } else if (digits.startsWith("5")) {
        type = "Mastercard";
      } else if (digits.startsWith("34") || digits.startsWith("37")) {
        type = "American Express";
      }
      
      onCardDetailsChange({ last4, type });
    } else {
      onCardDetailsChange(null);
    }
  };

  // Handle expiry date input
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatExpiryDate(e.target.value);
    setExpiryDate(formattedValue);
  };

  // Handle CVC input
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCvc(value);
  };

  // Toggle payment method
  const handleMethodChange = (method: 'card' | 'cash') => {
    onMethodChange(method);
    setCardFormVisible(method === 'card');
    
    // Reset card details if cash is selected
    if (method === 'cash') {
      onCardDetailsChange(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div 
          className="flex items-center p-4 cursor-pointer"
          onClick={() => handleMethodChange('card')}
        >
          <input 
            type="radio" 
            name="payment-method" 
            id="card" 
            className="h-4 w-4 text-primary" 
            checked={selectedMethod === 'card'} 
            onChange={() => handleMethodChange('card')}
          />
          <label htmlFor="card" className="ml-3 flex flex-grow items-center">
            <span className="font-medium text-gray-700">Credit/Debit Card</span>
            <span className="ml-auto flex space-x-2">
              <CreditCard className="h-5 w-5 text-blue-800" />
            </span>
          </label>
        </div>
        {selectedMethod === 'card' && cardFormVisible && (
          <div id="card-form" className="p-4 bg-gray-50 space-y-4 border-t">
            <div>
              <Label htmlFor="card-number">Card Number</Label>
              <Input
                type="text"
                id="card-number"
                placeholder="1234 5678 9012 3456"
                className="mt-1"
                value={cardNumber}
                onChange={handleCardNumberChange}
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  type="text"
                  id="expiry"
                  placeholder="MM/YY"
                  className="mt-1"
                  value={expiryDate}
                  onChange={handleExpiryDateChange}
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  type="text"
                  id="cvc"
                  placeholder="123"
                  className="mt-1"
                  value={cvc}
                  onChange={handleCvcChange}
                  maxLength={3}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <div 
          className="flex items-center p-4 cursor-pointer"
          onClick={() => handleMethodChange('cash')}
        >
          <input 
            type="radio" 
            name="payment-method" 
            id="cash" 
            className="h-4 w-4 text-primary" 
            checked={selectedMethod === 'cash'} 
            onChange={() => handleMethodChange('cash')}
          />
          <label htmlFor="cash" className="ml-3 flex flex-grow items-center">
            <span className="font-medium text-gray-700">Cash on Installation</span>
            <span className="ml-auto">
              <Banknote className="h-5 w-5 text-green-600" />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
