'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

interface BlueprintUploadProps {
  onUpload: (imageUrl: string, dimensions: { width: number; height: number }) => void;
  onSkip: () => void;
}

export default function BlueprintUpload({ onUpload, onSkip }: BlueprintUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setPreview(imageUrl);

      // Get image dimensions
      const img = new window.Image();
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height });
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (preview && dimensions) {
      onUpload(preview, dimensions);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Blueprint or Floor Plan</CardTitle>
        <CardDescription>
          Upload an image of your map, floor plan, or blueprint. You can skip this to use base map imagery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="blueprint">Select Image</Label>
          <Input
            id="blueprint"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        {preview && dimensions && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="relative w-full" style={{ maxHeight: '400px', overflow: 'auto' }}>
                <img src={preview} alt="Blueprint preview" className="max-w-full h-auto" />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Dimensions: {dimensions.width} x {dimensions.height} pixels
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleUpload} disabled={!preview} className="flex-1">
            Continue with Blueprint
          </Button>
          <Button onClick={onSkip} variant="outline" className="flex-1">
            Skip (Use Base Map)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
