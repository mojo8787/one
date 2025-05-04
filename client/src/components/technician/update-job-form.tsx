import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Job } from "@shared/schema";
import { Camera, Loader2, Upload } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";

interface UpdateJobFormProps {
  job: Job;
  onSubmit: (data: { notes: string; photoProofUrl?: string }) => void;
  isSubmitting: boolean;
}

export function UpdateJobForm({ job, onSubmit, isSubmitting }: UpdateJobFormProps) {
  const [notes, setNotes] = useState("");
  const [photoProofUrl, setPhotoProofUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

  // In a real app, this would upload to your server or cloud storage
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Simulate upload delay
    setTimeout(() => {
      // Create a data URL from the file (for demo purposes only)
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoProofUrl(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      notes,
      photoProofUrl
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="notes">Service Notes</Label>
        <Textarea
          id="notes"
          placeholder="Describe the work completed..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo-proof">Photo Proof</Label>
        <div className="flex items-center space-x-4">
          <div className="relative w-full">
            <input
              id="photo-proof"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="photo-proof"
              className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-primary"
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="mt-2 text-sm text-gray-500">Uploading...</span>
                </div>
              ) : photoProofUrl ? (
                <div className="flex flex-col items-center">
                  <Camera className="w-6 h-6 text-green-500" />
                  <span className="mt-2 text-sm text-green-500">Photo uploaded</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-6 h-6 text-gray-500" />
                  <span className="mt-2 text-sm text-gray-500">Click to upload a photo</span>
                </div>
              )}
            </label>
          </div>
          
          {photoProofUrl && (
            <div className="w-20 h-20 overflow-hidden rounded-md border border-gray-200">
              <img 
                src={photoProofUrl} 
                alt="Photo proof" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            "Complete Job"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}