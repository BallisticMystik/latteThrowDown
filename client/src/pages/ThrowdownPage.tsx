import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RotateCcw, Trophy, Clock, Upload, ChevronRight, Sparkles } from 'lucide-react';
import { Carousel3D, type CarouselImage } from '../components/Carousel3D';
import { Link } from 'react-router-dom';

const latteArtDesigns: CarouselImage[] = [
  { id: '1', src: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80', label: 'Classic Rosetta' },
  { id: '2', src: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&q=80', label: 'Tulip' },
  { id: '3', src: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80', label: 'Heart Pour' },
  { id: '4', src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80', label: 'Swan' },
  { id: '5', src: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&q=80', label: 'Fern Leaf' },
  { id: '6', src: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500&q=80', label: 'Double Rosetta' },
  { id: '7', src: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=500&q=80', label: 'Layered Tulip' },
  { id: '8', src: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&q=80', label: 'Phoenix' },
];

type Phase = 'ready' | 'spinning' | 'selected' | 'submitted';

export default function ThrowdownPage() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [stopIndex, setStopIndex] = useState<number | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<CarouselImage | null>(null);
  const [timeLeft] = useState(15 * 60); // 15 min timer placeholder

  const handleSpin = () => {
    setPhase('spinning');
    // Pick a random design after a brief delay
    setTimeout(() => {
      const idx = Math.floor(Math.random() * latteArtDesigns.length);
      setStopIndex(idx);
    }, 800);
  };

  const handleStopped = useCallback((image: CarouselImage) => {
    setSelectedDesign(image);
    setPhase('selected');
  }, []);

  const handleReset = () => {
    setPhase('ready');
    setStopIndex(null);
    setSelectedDesign(null);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Zap className="h-7 w-7 text-warning" />
          Latte Art Throwdown
          <Zap className="h-7 w-7 text-warning" />
        </h1>
        <p className="text-sm text-base-content/50 mt-2">
          Spin the carousel. Recreate the design. Prove your pour.
        </p>
      </motion.div>

      {/* Carousel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Carousel3D
          images={latteArtDesigns}
          radius={260}
          imgWidth={140}
          imgHeight={190}
          autoRotate={phase === 'ready' || phase === 'spinning'}
          rotateSpeed={phase === 'spinning' ? -20 : -60}
          stopOnIndex={stopIndex}
          onStopped={handleStopped}
        />
      </motion.div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 -mt-2">
        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3"
            >
              <p className="text-sm text-base-content/40">Drag to explore or spin to get your challenge</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSpin}
                className="btn btn-primary btn-lg gap-2 px-8 shadow-lg shadow-primary/25"
              >
                <Sparkles className="h-5 w-5" />
                Spin &amp; Pick
              </motion.button>
            </motion.div>
          )}

          {phase === 'spinning' && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RotateCcw className="h-6 w-6 text-primary" />
              </motion.div>
              <p className="text-sm text-base-content/60 font-medium">Finding your challenge...</p>
            </motion.div>
          )}

          {phase === 'selected' && selectedDesign && (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4 w-full max-w-md"
            >
              {/* Selected design card */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                className="card bg-base-200 border-2 border-primary/30 w-full overflow-hidden"
              >
                <div className="card-body p-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={selectedDesign.src}
                        alt={selectedDesign.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-primary font-medium uppercase tracking-wider">Your Challenge</p>
                      <h3 className="text-lg font-bold">{selectedDesign.label}</h3>
                      <p className="text-xs text-base-content/50 mt-0.5">Recreate this design in your cup</p>
                    </div>
                    <Trophy className="h-8 w-8 text-warning shrink-0" />
                  </div>

                  {/* Timer */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-base-300/50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium">Time Limit</span>
                    </div>
                    <span className="font-mono text-lg font-bold text-warning">{formatTime(timeLeft)}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleReset}
                      className="btn btn-ghost btn-sm flex-1 gap-1"
                    >
                      <RotateCcw className="h-4 w-4" /> Re-spin
                    </button>
                    <Link
                      to="/create"
                      className="btn btn-primary btn-sm flex-1 gap-1"
                    >
                      <Upload className="h-4 w-4" /> Submit Pour
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Instructions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center space-y-1"
              >
                <p className="text-xs text-base-content/40">
                  Pour your best recreation, snap a photo, and submit before time runs out.
                </p>
                <p className="text-xs text-base-content/30">
                  Judged on accuracy, technique, and style.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
