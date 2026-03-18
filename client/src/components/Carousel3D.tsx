import { useEffect, useRef, useCallback, useState } from 'react';

export interface CarouselImage {
  id: string;
  src: string;
  label?: string;
}

interface Carousel3DProps {
  images: CarouselImage[];
  radius?: number;
  imgWidth?: number;
  imgHeight?: number;
  autoRotate?: boolean;
  rotateSpeed?: number;
  /** When set, carousel decelerates and stops on this image index */
  stopOnIndex?: number | null;
  onStopped?: (image: CarouselImage) => void;
  className?: string;
}

export function Carousel3D({
  images,
  radius = 280,
  imgWidth = 150,
  imgHeight = 200,
  autoRotate = true,
  rotateSpeed = -60,
  stopOnIndex = null,
  onStopped,
  className = '',
}: Carousel3DProps) {
  const dragRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ tX: 0, tY: 10, desX: 0, desY: 0, radius });
  const timerRef = useRef<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(autoRotate);
  const [currentRadius, setCurrentRadius] = useState(radius);

  // Position images in 3D circle
  const positionImages = useCallback((r: number, delayTime?: string) => {
    const spin = spinRef.current;
    if (!spin) return;
    const elements = spin.querySelectorAll<HTMLElement>('.carousel3d-item');
    elements.forEach((el, i) => {
      const angle = i * (360 / images.length);
      el.style.transform = `rotateY(${angle}deg) translateZ(${r}px)`;
      el.style.transition = 'transform 1s';
      el.style.transitionDelay = delayTime || `${(images.length - i) / 4}s`;
    });
  }, [images.length]);

  // Init
  useEffect(() => {
    const spin = spinRef.current;
    const ground = groundRef.current;
    if (!spin || !ground) return;

    spin.style.width = `${imgWidth}px`;
    spin.style.height = `${imgHeight}px`;
    ground.style.width = `${currentRadius * 3}px`;
    ground.style.height = `${currentRadius * 3}px`;

    const timer = setTimeout(() => positionImages(currentRadius), 100);
    return () => clearTimeout(timer);
  }, [imgWidth, imgHeight, currentRadius, positionImages]);

  // Drag interaction
  useEffect(() => {
    const drag = dragRef.current;
    if (!drag) return;
    const state = stateRef.current;

    function applyTransform() {
      if (!drag) return;
      state.tY = Math.max(0, Math.min(180, state.tY));
      drag.style.transform = `rotateX(${-state.tY}deg) rotateY(${state.tX}deg)`;
    }

    function onPointerDown(e: PointerEvent) {
      if (timerRef.current) clearInterval(timerRef.current);
      let sX = e.clientX;
      let sY = e.clientY;

      function onPointerMove(e: PointerEvent) {
        const nX = e.clientX;
        const nY = e.clientY;
        state.desX = nX - sX;
        state.desY = nY - sY;
        state.tX += state.desX * 0.1;
        state.tY += state.desY * 0.1;
        applyTransform();
        sX = nX;
        sY = nY;
      }

      function onPointerUp() {
        timerRef.current = window.setInterval(() => {
          state.desX *= 0.95;
          state.desY *= 0.95;
          state.tX += state.desX * 0.1;
          state.tY += state.desY * 0.1;
          applyTransform();
          if (spinRef.current) {
            spinRef.current.style.animationPlayState = 'paused';
          }
          if (Math.abs(state.desX) < 0.5 && Math.abs(state.desY) < 0.5) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (spinRef.current && isSpinning) {
              spinRef.current.style.animationPlayState = 'running';
            }
          }
        }, 17);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      }

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const d = e.deltaY > 0 ? -8 : 8;
      const newR = Math.max(150, Math.min(500, stateRef.current.radius + d));
      stateRef.current.radius = newR;
      setCurrentRadius(newR);
      positionImages(newR, '0.3s');
    }

    drag.addEventListener('pointerdown', onPointerDown);
    drag.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      drag.removeEventListener('pointerdown', onPointerDown);
      drag.removeEventListener('wheel', onWheel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSpinning, positionImages]);

  // Handle stop-on-index (decelerate to target)
  useEffect(() => {
    if (stopOnIndex === null || stopOnIndex === undefined) return;
    const spin = spinRef.current;
    if (!spin) return;

    // Stop auto-rotation
    setIsSpinning(false);
    spin.style.animation = 'none';

    // Calculate target angle to face the selected image toward camera
    const targetAngle = -(stopOnIndex * (360 / images.length));

    // Animate drag container to target
    const drag = dragRef.current;
    if (!drag) return;

    // Do a couple extra spins for drama, then land on target
    const state = stateRef.current;
    const extraSpins = 2;
    const totalRotation = targetAngle - state.tX + (360 * extraSpins);
    const duration = 3000;
    const startTime = performance.now();
    const startX = state.tX;

    function easeOutCubic(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      state.tX = startX + totalRotation * eased;
      state.tY = 10;
      drag!.style.transform = `rotateX(${-state.tY}deg) rotateY(${state.tX}deg)`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Done — notify parent
        if (stopOnIndex != null && stopOnIndex >= 0 && stopOnIndex < images.length) {
          onStopped?.(images[stopOnIndex]);
        }
      }
    }

    requestAnimationFrame(animate);
  }, [stopOnIndex, images, onStopped]);

  const animationName = rotateSpeed > 0 ? 'spin' : 'spinRevert';
  const animationStyle = isSpinning
    ? { animation: `${animationName} ${Math.abs(rotateSpeed)}s infinite linear` }
    : {};

  return (
    <div className={`carousel3d-wrapper ${className}`}>
      <div className="carousel3d-drag" ref={dragRef}>
        <div className="carousel3d-spin" ref={spinRef} style={animationStyle}>
          {images.map((img, i) => (
            <div key={img.id} className="carousel3d-item" data-index={i}>
              <img src={img.src} alt={img.label || `Image ${i + 1}`} draggable={false} />
              {img.label && <span className="carousel3d-label">{img.label}</span>}
            </div>
          ))}
        </div>
        <div className="carousel3d-ground" ref={groundRef} />
      </div>
    </div>
  );
}
