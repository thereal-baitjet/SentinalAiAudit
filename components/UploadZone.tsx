import React, { useRef, useState } from 'react';
import { UploadIcon } from './Icons';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  onError: (msg: string) => void;
  isProcessing: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, onError, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      onError("File is too large for this MVP demo. Please upload a video smaller than 20MB.");
      return;
    }
    if (!file.type.startsWith('video/')) {
      onError("Invalid file type. Please upload a video file (MP4, MOV).");
      return;
    }
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onClick={isProcessing ? undefined : handleClick}
      onDragOver={isProcessing ? undefined : handleDragOver}
      onDragLeave={isProcessing ? undefined : handleDragLeave}
      onDrop={isProcessing ? undefined : handleDrop}
      className={`
        relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-12 text-center cursor-pointer
        ${isDragging 
          ? 'border-blue-500 bg-blue-500/10' 
          : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900'
        }
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept="video/*"
        className="hidden"
        disabled={isProcessing}
      />
      <div className="z-10 flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-zinc-800 border border-zinc-700">
            <UploadIcon className="w-8 h-8 text-zinc-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-zinc-100">Upload CCTV Footage</h3>
          <p className="text-zinc-400 text-sm mt-1">Drag & drop or click to browse (MP4, MOV)</p>
        </div>
        <div className="text-xs text-amber-500/80 bg-amber-950/30 px-3 py-1 rounded border border-amber-900/50 mt-2 font-mono">
            MVP Demo Limit: Max 20MB File Size
        </div>
      </div>
    </div>
  );
};

export default UploadZone;