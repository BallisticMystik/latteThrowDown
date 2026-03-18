import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Loader2, Hash } from 'lucide-react';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { post } from '@/lib/api';
import ContentUploader from '@/components/content/ContentUploader';

const MAX_CAPTION = 500;

interface CreatedPost {
  id: string;
  [key: string]: unknown;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

export default function CreateContentPage() {
  const navigate = useNavigate();
  const {
    upload,
    reset: resetUpload,
    uploading,
    progress,
    error: uploadError,
    mediaAsset,
  } = useVideoUpload();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  /* ── Derived values ── */
  const hashtags = useMemo(() => {
    const matches = caption.match(/#\w+/g);
    return matches ? [...new Set(matches)] : [];
  }, [caption]);

  const captionLength = caption.length;
  const captionColor =
    captionLength >= 490
      ? 'text-error'
      : captionLength >= 450
        ? 'text-warning'
        : 'text-base-content/40';

  const previewUrl = useMemo(() => {
    // Revoke previous blob URL to avoid memory leaks
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      previewUrlRef.current = url;
      return url;
    }
    return null;
  }, [selectedFile]);

  const isVideo = selectedFile?.type.startsWith('video/') ?? false;

  /* ── Handlers ── */
  const handleFileSelected = useCallback(
    (file: File) => {
      setSelectedFile(file);
      upload(file);
    },
    [upload],
  );

  const handleBack = useCallback(() => {
    setDirection(-1);
    setStep(1);
    setSelectedFile(null);
    setCaption('');
    setPublishError(null);
    resetUpload();
  }, [resetUpload]);

  // Advance to step 2 once upload succeeds
  if (mediaAsset && step === 1 && !uploading) {
    setStep(2);
    setDirection(1);
  }

  const handlePublish = useCallback(async () => {
    if (!mediaAsset) return;
    setPublishing(true);
    setPublishError(null);

    try {
      const res = await post<CreatedPost>('/api/content/posts', {
        media_asset_id: mediaAsset.id,
        caption: caption.trim() || null,
      });

      if (!res.success) {
        setPublishError(res.error ?? 'Failed to publish');
        setPublishing(false);
        return;
      }

      navigate('/content');
    } catch {
      setPublishError('Network error — please try again.');
      setPublishing(false);
    }
  }, [mediaAsset, caption, navigate]);

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      {/* Step indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold">New Post</h1>
        <span className="text-sm text-base-content/50">
          Step {step} of 2
        </span>
      </motion.div>

      {/* Step progress dots */}
      <div className="flex gap-2">
        <div
          className={`h-1 flex-1 rounded-full transition-colors ${
            step >= 1 ? 'bg-primary' : 'bg-base-300'
          }`}
        />
        <div
          className={`h-1 flex-1 rounded-full transition-colors ${
            step >= 2 ? 'bg-primary' : 'bg-base-300'
          }`}
        />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait" custom={direction}>
        {step === 1 && (
          <motion.div
            key="step-1"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ContentUploader
              onFileSelected={handleFileSelected}
              onUploadComplete={() => {}}
              uploading={uploading}
              progress={progress}
              error={uploadError}
            />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex flex-col gap-6"
          >
            {/* Preview */}
            {previewUrl && (
              <div className="rounded-xl overflow-hidden bg-base-200 border border-base-300">
                {isVideo ? (
                  <video
                    src={previewUrl}
                    controls
                    muted
                    playsInline
                    className="w-full max-h-[50vh] object-contain bg-black"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-[50vh] object-contain bg-black"
                  />
                )}
              </div>
            )}

            {/* Caption */}
            <div>
              <label className="text-sm font-medium mb-2 block">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CAPTION) {
                    setCaption(e.target.value);
                  }
                }}
                placeholder="What's happening at the bar?"
                rows={4}
                className="textarea textarea-bordered w-full bg-base-200 border-base-300 focus:border-primary/50 resize-none"
              />
              <div className="flex items-center justify-end mt-1">
                <span className={`text-xs ${captionColor}`}>
                  {captionLength}/{MAX_CAPTION}
                </span>
              </div>
            </div>

            {/* Hashtag pills */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="badge badge-outline badge-sm gap-1 py-2"
                  >
                    <Hash className="h-3 w-3" />
                    {tag.slice(1)}
                  </span>
                ))}
              </div>
            )}

            {/* Publish error */}
            {publishError && (
              <div className="text-sm text-error text-center">
                {publishError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                className="btn btn-ghost flex-1 gap-2 min-h-[44px]"
                onClick={handleBack}
                disabled={publishing}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1 gap-2 min-h-[44px]"
                onClick={handlePublish}
                disabled={publishing || !mediaAsset}
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Post
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
