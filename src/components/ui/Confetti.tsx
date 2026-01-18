/**
 * Confetti Component
 *
 * Canvas-based confetti animation for celebrating achievements.
 * Triggers when a domain reaches 100% completion.
 */

import React, { useEffect, useRef, useCallback } from 'react';

interface ConfettiProps {
  active: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'square' | 'circle' | 'triangle';
  opacity: number;
}

const DEFAULT_COLORS = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

const Confetti: React.FC<ConfettiProps> = ({
  active,
  duration = 3000,
  particleCount = 100,
  colors = DEFAULT_COLORS,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const createParticle = useCallback((canvasWidth: number, _canvasHeight: number): Particle => {
    const shape = ['square', 'circle', 'triangle'][Math.floor(Math.random() * 3)] as Particle['shape'];
    return {
      x: Math.random() * canvasWidth,
      y: -20 - Math.random() * 50,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      shape,
      opacity: 1,
    };
  }, [colors]);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    ctx.globalAlpha = particle.opacity;
    ctx.fillStyle = particle.color;

    switch (particle.shape) {
      case 'square':
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -particle.size / 2);
        ctx.lineTo(particle.size / 2, particle.size / 2);
        ctx.lineTo(-particle.size / 2, particle.size / 2);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }, []);

  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((particle) => {
      // Update physics
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.rotation += particle.rotationSpeed;
      particle.vx *= 0.99; // Air resistance

      // Fade out towards the end
      if (progress > 0.7) {
        particle.opacity = 1 - (progress - 0.7) / 0.3;
      }

      // Draw if still visible
      if (particle.y < canvas.height + 20 && particle.opacity > 0) {
        drawParticle(ctx, particle);
        return true;
      }
      return false;
    });

    // Continue animation or complete
    if (progress < 1 || particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  }, [duration, drawParticle, onComplete]);

  useEffect(() => {
    if (!active) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      particlesRef.current = [];
      startTimeRef.current = undefined;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create initial particles
    particlesRef.current = Array.from({ length: particleCount }, () =>
      createParticle(canvas.width, canvas.height)
    );

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [active, particleCount, createParticle, animate]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default Confetti;

// Hook for easy confetti triggering
export function useConfetti() {
  const [isActive, setIsActive] = React.useState(false);

  const trigger = useCallback(() => {
    setIsActive(true);
  }, []);

  const complete = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    isActive,
    trigger,
    Confetti: () => <Confetti active={isActive} onComplete={complete} />,
  };
}
