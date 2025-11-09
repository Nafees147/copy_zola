import React, { useState, useRef, ReactElement, DragEvent, useEffect } from 'react';
import { ImageFile } from '../types';

interface ImageUploaderProps {
  id: string;
  title: string;
  icon: ReactElement;
  onImageUpload: (file: ImageFile) => void;
  currentFile: ImageFile;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, title, icon, onImageUpload, currentFile }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentFile?.dataUrl || null);
  }, [currentFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      console.error("Invalid file type. Please upload an image.");
      setIsDragging(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setPreviewUrl(dataUrl);
      onImageUpload({
        dataUrl,
        base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent label from triggering file input
    setPreviewUrl(null);
    onImageUpload(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const handleDrag = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOut = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  return (
    <label
      htmlFor={id}
      className={`relative flex-1 p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-100 transition-all duration-300 cursor-pointer aspect-[4/5] ${isDragging ? 'border-indigo-500 bg-indigo-50 border-solid' : 'border-gray-300'}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id={id}
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {previewUrl ? (
        <>
          <img src={previewUrl} alt={title} className="absolute inset-0 w-full h-full object-cover rounded-xl pointer-events-none" />
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white rounded-full p-1.5 hover:bg-opacity-75 transition-opacity"
            aria-label="Remove image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center text-center text-gray-500 pointer-events-none">
          <div className="w-14 h-14 mb-3 text-gray-400">
            {icon}
          </div>
          <p className="font-semibold text-sm text-gray-700">{title}</p>
          <p className="text-xs mt-1">PNG, JPG, WEBP up to 7MB</p>
          {isDragging && (
            <p className="mt-4 text-sm font-semibold text-indigo-600">
              Drop your image here
            </p>
          )}
        </div>
      )}
    </label>
  );
};

export default ImageUploader;
