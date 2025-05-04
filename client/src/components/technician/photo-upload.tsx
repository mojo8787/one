import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface PhotoUploadProps {
  onPhotoUploaded: (photoUrl: string | null) => void;
}

export function PhotoUpload({ onPhotoUploaded }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Basic file validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('File size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const newPhotos = [...photos, reader.result];
        setPhotos(newPhotos);
        
        // Notify parent component of the latest photo
        onPhotoUploaded(reader.result);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleAddPhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    
    // Notify parent component of the latest photo or null if no photos
    onPhotoUploaded(newPhotos.length > 0 ? newPhotos[newPhotos.length - 1] : null);
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        capture="environment" // Prefer the back camera on mobile devices
      />
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        {photos.map((photo, index) => (
          <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden relative">
            <img src={photo} alt={`Proof ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              onClick={() => handleRemovePhoto(index)}
            >
              ×
            </button>
          </div>
        ))}
        
        {photos.length < 2 && (
          <div 
            className="aspect-square bg-gray-100 rounded flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={handleAddPhotoClick}
          >
            <Camera className="h-6 w-6 mb-1" />
            <span className="text-xs">Add Photo</span>
          </div>
        )}
        
        {photos.length < 2 && photos.length > 0 && (
          <div 
            className="aspect-square bg-gray-100 rounded flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={handleAddPhotoClick}
          >
            <Camera className="h-6 w-6 mb-1" />
            <span className="text-xs">Add Photo</span>
          </div>
        )}
      </div>
    </div>
  );
}
