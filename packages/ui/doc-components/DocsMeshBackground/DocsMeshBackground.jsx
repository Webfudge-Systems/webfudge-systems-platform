'use client';

import { MeshGradient } from '@paper-design/shaders-react';
import { useEffect, useState } from 'react';

const LIGHT_COLORS = ['#fff7ed', '#ffedd5', '#ffd7b5', '#f97316', '#f5630f', '#fef3c7'];
const DARK_COLORS = ['#09090b', '#1c1917', '#431407', '#7c2d12', '#f5630f', '#fbbf24'];

export function DocsMeshBackground({ isDark = false }) {
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    setMounted(true);

    const update = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {mounted ? (
        <MeshGradient
          width={dimensions.width}
          height={dimensions.height}
          colors={isDark ? DARK_COLORS : LIGHT_COLORS}
          distortion={isDark ? 0.55 : 0.72}
          swirl={isDark ? 0.42 : 0.58}
          grainMixer={0}
          grainOverlay={0}
          speed={0.28}
          offsetX={0.08}
        />
      ) : null}
      <div
        className={
          isDark
            ? 'absolute inset-0 bg-black/45'
            : 'absolute inset-0 bg-[linear-gradient(180deg,rgba(255,247,237,0.35),rgba(255,237,213,0.58))]'
        }
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.28) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}

export default DocsMeshBackground;
