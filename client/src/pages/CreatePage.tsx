import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, Video, Trophy, ChevronDown, CheckCircle2, AlertCircle, X } from 'lucide-react';

const eligibleContests = [
  { id: '1', title: 'Spring Latte Art Open', daysLeft: 3, entries: '47/64' },
  { id: '2', title: 'PNW Rosetta Championship', daysLeft: 7, entries: '28/32' },
  { id: '5', title: 'Freestyle Pour Invitational', daysLeft: 12, entries: '15/32' },
];

const guidelines = [
  'Original latte art — no stock photos or AI-generated images',
  'Clear, well-lit photo or video of your pour',
  'Maximum 30 seconds for video submissions',
  'One entry per contest per barista',
];

export default function CreatePage() {
  const [selectedContest, setSelectedContest] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<{ name: string; type: string } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const isReady = selectedContest && title && file;

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold">Submit Entry</h1>
        <p className="text-sm text-base-content/50 mt-1">Upload your best pour and enter a contest</p>
      </motion.div>

      {/* Contest selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <label className="text-sm font-medium mb-2 block">Choose a contest</label>
        <div className="relative">
          <select
            value={selectedContest}
            onChange={(e) => setSelectedContest(e.target.value)}
            className="select select-bordered w-full bg-base-200 border-base-300 appearance-none pr-10"
          >
            <option value="">Select a contest...</option>
            {eligibleContests.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.daysLeft}d left ({c.entries})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/40 pointer-events-none" />
        </div>
      </motion.div>

      {/* Upload area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <label className="text-sm font-medium mb-2 block">Upload media</label>
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                setFile({ name: 'latte-art-pour.jpg', type: 'image' });
              }}
              onClick={() => setFile({ name: 'latte-art-pour.jpg', type: 'image' })}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300 bg-base-200/50 hover:border-primary/50 hover:bg-base-200'
              }`}
            >
              <motion.div
                animate={dragActive ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Upload className={`h-10 w-10 mx-auto mb-3 ${dragActive ? 'text-primary' : 'text-base-content/30'}`} />
              </motion.div>
              <p className="text-sm font-medium">
                {dragActive ? 'Drop it here!' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-base-content/40 mt-1">PNG, JPG, or MP4 up to 50MB</p>
              <div className="flex justify-center gap-6 mt-4 text-xs text-base-content/40">
                <span className="flex items-center gap-1"><Image className="h-3.5 w-3.5" /> Photo</span>
                <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Video</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="relative rounded-xl bg-base-200 border border-base-300 p-4"
            >
              <button
                onClick={() => setFile(null)}
                className="absolute top-2 right-2 btn btn-ghost btn-circle btn-xs"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Image className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-success flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready to submit
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Title & caption */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="text-sm font-medium mb-2 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Rosetta Bloom"
            className="input input-bordered w-full bg-base-200 border-base-300 focus:border-primary/50"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Caption <span className="text-base-content/40">(optional)</span></label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell us about your pour..."
            rows={3}
            className="textarea textarea-bordered w-full bg-base-200 border-base-300 focus:border-primary/50 resize-none"
          />
        </div>
      </motion.div>

      {/* Guidelines */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-xl bg-base-200/50 border border-base-300/50 p-4"
      >
        <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          Submission Guidelines
        </h3>
        <ul className="space-y-1.5">
          {guidelines.map((g, i) => (
            <li key={i} className="text-xs text-base-content/50 flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-base-content/30 mt-1.5 shrink-0" />
              {g}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Originality agreement & submit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="flex flex-col gap-3"
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="checkbox checkbox-primary checkbox-sm mt-0.5" />
          <span className="text-xs text-base-content/60">
            I confirm this is my original work and I agree to the competition rules.
          </span>
        </label>

        <motion.button
          whileHover={isReady ? { scale: 1.01 } : undefined}
          whileTap={isReady ? { scale: 0.98 } : undefined}
          className={`btn btn-primary w-full gap-2 ${!isReady ? 'btn-disabled opacity-50' : ''}`}
        >
          <Trophy className="h-4 w-4" />
          Submit Entry
        </motion.button>
      </motion.div>
    </div>
  );
}
