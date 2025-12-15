import React, { useRef, useEffect } from 'react';

interface VideoPlayerProps {
  src: string;
  seekTime: number | null;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, seekTime, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && seekTime !== null) {
      videoRef.current.currentTime = seekTime;
      videoRef.current.play().catch(e => console.log("Auto-play prevented by browser policy", e));
    }
  }, [seekTime]);

  return (
    <div className={`relative overflow-hidden rounded-lg bg-black border border-zinc-800 shadow-xl ${className}`}>
      <video
        ref={videoRef}
        src={src}
        controls
        className="w-full h-full object-contain max-h-[60vh]"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
