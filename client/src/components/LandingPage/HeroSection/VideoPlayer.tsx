import React, { useRef, useState } from 'react';

interface VideoPlayerProps {
  onVideoEnd: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ onVideoEnd }) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onLoadedData={() => setIsVideoLoaded(true)}
        onEnded={onVideoEnd}
      >
        <source src="/images/hero.mp4" type="video/mp4" />
      </video>
    </div>
  );
};

export default VideoPlayer;
