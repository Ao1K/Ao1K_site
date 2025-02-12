import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Youtube from '../icons/youtube';
import Close from '../icons/close';
import YouTubeEmbed from '../YoutubeEmbed';

export default function VideoHelpPrompt({ videoId }: { videoId: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (Cookies.get('videoHelpDismissed') === 'true') {
      setDismissed(true);
    }
  }, []);

  const openVideo = () => {
    setIsOpen(true);
  };

  const closeVideo = () => {
    setIsOpen(false);
  };

  const closeForever = () => {
    Cookies.set('videoHelpDismissed', 'true', { expires: 9999 });
    setDismissed(true);
  };

  if (dismissed) {
    return null;
  }

  return (
    <div>
      {!isOpen && !dismissed && (
        <div className="flex flex-row">
        <div className="flex mt-6 mx-4">
          <button
            className="flex p-3 bg-primary-800 rounded-l-md text-primary-100 font-regular select-none border border-primary-100"
            onClick={openVideo}
          >
            <Youtube className="w-6 h-6 mr-2 text-primary-100" />
            How to use this
          </button>
            <button
            className="flex p-3 bg-primary-800 rounded-r-md text-red-500 font-regular select-none border border-primary-100 border-l-0 group relative"
            onClick={closeForever}
            >
            <Close className="w-5 h-5 mt-[2px]" />
            <span className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 text-sm rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
              dismiss forever
            </span>
            </button>
        </div>
        </div>
      )}

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center" 
          onClick={closeVideo}
        >
          <div 
            className="relative bg-white w-[90%] max-w-[800px] p-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 px-2 text-xl"
              onClick={closeVideo}
            >
              &times;
            </button>
            <YouTubeEmbed videoId={videoId} />
          </div>
        </div>
      )}
    </div>
  );
}