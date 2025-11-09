import React from 'react';
import { DownloadIcon } from './icons';

export interface CollectionItem {
    id: string; // background id or 'original'
    imageUrl: string;
}

interface CollectionModalProps {
  images: CollectionItem[];
  poseName: string;
  onClose: () => void;
}

const CollectionModal: React.FC<CollectionModalProps> = ({ images, poseName, onClose }) => {
  const handleDownload = async (imageUrl: string, id: string, index: number) => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${poseName.replace(/\s+/g, '_')}-${id}-variation-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download failed:", error);
        // Optionally, add user-facing error feedback here
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Collection for "{poseName}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
          {images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {images.map((item, index) => (
                <div key={index} className="group relative aspect-[4/5] bg-gray-100 rounded-xl shadow-md overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={`Variation ${index + 1}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleDownload(item.imageUrl, item.id, index)}
                      className="flex items-center justify-center px-4 py-2 bg-white/90 text-gray-800 font-semibold rounded-full shadow-lg hover:bg-white"
                      title="Download Image"
                    >
                      <DownloadIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">This collection is empty.</p>
          )}
        </div>
        
        <footer className="flex justify-end p-4 border-t bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-full shadow-sm hover:bg-gray-100 transition-colors">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CollectionModal;