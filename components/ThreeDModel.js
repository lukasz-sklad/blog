import React from 'react';

const ThreeDModel = ({ src, alt }) => {
  return (
    <div className="w-full h-96 my-8 bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
      <model-viewer
        src={src}
        alt={alt}
        auto-rotate
        camera-controls
        ar
        shadow-intensity="1"
        style={{ width: '100%', height: '100%' }}
      >
      </model-viewer>
    </div>
  );
};

export default ThreeDModel;
