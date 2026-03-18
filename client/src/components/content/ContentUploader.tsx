import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import type { MediaAsset } from '@/hooks/useVideoUpload';

interface ContentUploaderProps {
  onFileSelected: (file: File) => void;
  onUploadComplete: (mediaAsset: MediaAsset) => void;
  uploading: boolean;
  progress: number;
  error: string | null;
}

const ACCEPT = 'video/*,image/*';

export default function ContentUploader({
  onFileSelected,
  onUploadComplete: _onUploadComplete,
  uploading,
  progress,
  error,
}: ContentUploaderProps) {
  // Suppress unused-parameter lint — parent manages onUploadComplete via hook state
  void _onUploadComplete;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
      // Reset so the same file can be re-selected after an error
      e.target.value = '';
    },
    [handleFile],
  );

  /* ── Uploading state ── */
  if (uploading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-8 min-h-[50vh]"
      >
        <Upload className="h-10 w-10 text-primary animate-pulse" />
        <p className="text-sm font-medium">Uploading...</p>

        {/* DaisyUI progress bar */}
        <div className="w-full max-w-xs">
          <progress
            className="progress progress-primary w-full"
            value={progress}
            max="100"
          />
        </div>
        <p className="text-xs text-base-content/50">{progress}%</p>
      </motion.div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-error/30 bg-error/5 p-8 min-h-[50vh]"
      >
        <AlertCircle className="h-10 w-10 text-error" />
        <p className="text-sm text-error text-center max-w-xs">{error}</p>
        <button
          type="button"
          className="btn btn-error btn-sm gap-2 min-h-[44px]"
          onClick={() => fileInputRef.current?.click()}
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleInputChange}
        />
      </motion.div>
    );
  }

  /* ── Empty / drop-zone state ── */
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dropzone"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 p-8 min-h-[50vh] ${
          dragActive
            ? 'border-primary bg-primary/10'
            : 'border-base-300 bg-base-200/50 hover:border-primary/50 hover:bg-base-200'
        }`}
      >
        <motion.div
          animate={dragActive ? { scale: 1.15, y: -6 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Upload
            className={`h-12 w-12 ${dragActive ? 'text-primary' : 'text-base-content/30'}`}
          />
        </motion.div>

        <div className="text-center">
          <p className="text-sm font-medium">
            {dragActive ? 'Drop to upload' : 'Drag & drop or tap to select'}
          </p>
          <p className="text-xs text-base-content/40 mt-1">
            Video or photo &middot; Max 60s / 100MB
          </p>
        </div>

        {/* Mobile camera button */}
        <button
          type="button"
          className="btn btn-outline btn-sm gap-2 min-h-[44px] sm:hidden"
          onClick={(e) => {
            e.stopPropagation();
            cameraInputRef.current?.click();
          }}
        >
          <Camera className="h-4 w-4" />
          Open Camera
        </button>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="video/*,image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />
      </motion.div>
    </AnimatePresence>
  );
}
