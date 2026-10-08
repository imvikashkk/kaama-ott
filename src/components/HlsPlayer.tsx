'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function HlsPlayer({ url, onEnded }: { url: string; onEnded?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      return () => hls.destroy();
    }
  }, [url]);

  return (
    <video
      ref={videoRef}
      controls
      controlsList="nodownload"
      playsInline
      autoPlay
      onEnded={onEnded}
      className="absolute inset-0 w-full h-full"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
      }}
    />
  );
}