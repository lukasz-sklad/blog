import React from 'react';

const VideoPlayer = ({ src, title, controls = true, autoPlay = false, loop = false, muted = false, ...props }) => {
  return (
    <div style={{ margin: '20px 0', textAlign: 'center' }}>
      {title && <p style={{ marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>{title}</p>}
      <video
        src={src}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
        {...props}
      >
        Twoja przeglądarka nie obsługuje tagu wideo.
      </video>
      {title && <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>{title}</p>}
    </div>
  );
};

export default VideoPlayer;
