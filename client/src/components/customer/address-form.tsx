import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User, Address } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface AddressFormProps {
  onAddressChange: (address: Address | null) => void;
}

export function AddressForm({ onAddressChange }: AddressFormProps) {
  const { user } = useAuth();
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [zip, setZip] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 31.9539, // Default to Amman, Jordan
    lng: 35.9106
  });

  // Get user data to pre-fill form
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: !!user,
  });

  // Pre-fill form if user has address data
  useEffect(() => {
    if (userData) {
      if (userData.address) setAddress(userData.address);
      if (userData.city) setCity(userData.city);
      if (userData.addressCoordinates) setCoordinates(userData.addressCoordinates);
    }
  }, [userData]);

  // Update parent component when form changes
  useEffect(() => {
    if (address && city) {
      onAddressChange({
        address,
        city,
        zip,
        notes,
        coordinates
      });
    } else {
      onAddressChange(null);
    }
  }, [address, city, zip, notes, coordinates, onAddressChange]);

  // Simulating map click for demo (in a real app, this would use Google Maps API)
  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const mapElement = event.currentTarget;
    const rect = mapElement.getBoundingClientRect();
    
    // Calculate click position as a percentage of the map size
    const xPercent = (event.clientX - rect.left) / rect.width;
    const yPercent = (event.clientY - rect.top) / rect.height;
    
    // Convert to a reasonable latitude/longitude range around Amman, Jordan
    const lat = 31.9539 + (yPercent - 0.5) * 0.1;
    const lng = 35.9106 + (xPercent - 0.5) * 0.1;
    
    setCoordinates({ lat, lng });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="address">Street Address</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your address"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Amman"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="zip">Zip Code</Label>
          <Input
            id="zip"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="11111"
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label className="block mb-2">Pin your location on the map</Label>
        <div 
          className="bg-gray-200 h-48 rounded-md overflow-hidden relative mb-2 cursor-pointer"
          onClick={handleMapClick}
        >
          {/* Map placeholder - would be implemented with Google Maps API */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-gray-400">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
            </svg>
          </div>
          <div 
            className="absolute" 
            style={{ 
              left: `${((coordinates.lng - 35.9106) / 0.1 + 0.5) * 100}%`, 
              top: `${((coordinates.lat - 31.9539) / 0.1 + 0.5) * 100}%`, 
              transform: 'translate(-50%, -50%)' 
            }}
          >
            <MapPin className="h-8 w-8 text-primary" />
          </div>
        </div>
        <p className="text-xs text-gray-500">Drag the pin to adjust your exact location</p>
      </div>
      <div>
        <Label htmlFor="notes">Additional Instructions</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Building number, landmarks, access instructions..."
          className="mt-1"
          rows={2}
        />
      </div>
    </div>
  );
}
