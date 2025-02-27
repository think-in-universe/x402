'use client';

import { useMediaQuery } from '../hooks/useMediaQuery';

type BackgroundVideoProps = {
  src: string;
};

export function BackgroundVideo({ src }: BackgroundVideoProps) {
  const isDesktop = useMediaQuery('(min-width: 1280px)');

  if (!isDesktop) {
    return null;
  }

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      className="w-full h-full object-cover opacity-30 blur-md"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
