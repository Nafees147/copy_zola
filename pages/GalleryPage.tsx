import React, { useState } from 'react';
import { User, GeneratedAsset } from '../types';
import Spinner from '../components/Spinner';
import { DownloadIcon, ShareIcon, TrashIcon } from '../components/icons';

interface GalleryPageProps {
  user: User;
  assets: GeneratedAsset[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDelete: (asset: GeneratedAsset) => void;
  deletingAssetId: string | null;
}

const dataURLtoFile = async (dataUrl: string, filename: string): Promise<File | null> => {
  try {
    const res = await fetch(dataUrl);
    const blob: Blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error('Error converting data URL to File:', error);
    return null;
  }
}

const GalleryPage: React.FC<GalleryPageProps> = ({ user, assets, isLoading, error, onRefresh, onDelete, deletingAssetId }) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const handleDownload = async (asset: GeneratedAsset) => {
    if (downloadingId) return; // Prevent multiple concurrent downloads
    setDownloadingId(asset.id);
    try {
        const response = await fetch(asset.display_url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `zola-ai-gallery-${asset.id.substring(0, 8)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Could not download the image. Please try again.');
    } finally {
        setDownloadingId(null);
    }
  };

  const handleShare = async (asset: GeneratedAsset) => {
    const fileName = `zola-ai-gallery-${asset.id.substring(0, 8)}.png`;
    const shareText = `Check out this asset from ZOLA AI!`;
    const file = await dataURLtoFile(asset.display_url, fileName);

    if (!file) {
      alert("Could not prepare image for sharing.");
      return;
    }

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'ZOLA AI Asset',
          text: shareText,
          files: [file],
        });
      } catch (error) { console.log('Sharing cancelled or failed', error); }
    } else {
        alert("Sharing not supported on this browser. Please download the image instead.");
    }
  };
  
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <header className="mb-8 flex flex-wrap justify-between items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-[#2E1E1E] font-headline">My Gallery</h1>
              <p className="text-gray-600 mt-1">Your saved virtual try-ons and generated assets.</p>
            </div>
            <button 
              onClick={onRefresh} 
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-full shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0121.5 13M20 20l-1.5-1.5A9 9 0 012.5 11" />
              </svg>
              Refresh
            </button>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : error ? (
            <div className="text-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                <p>{error}</p>
            </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
            <h2 className="text-xl font-semibold text-gray-700">Your gallery is empty.</h2>
            <p className="mt-2 text-gray-500">Go to the 'Virtual Photoshoot' to create and save your first look!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
            {assets.map((asset) => {
              return (
                <div key={asset.id} className="group relative aspect-[4/5] bg-gray-100 rounded-xl shadow-lg overflow-hidden border border-gray-200">
                  <img
                    src={asset.display_url}
                    alt={`Generated asset from ${asset.source_feature}`}
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                          <button
                              onClick={() => handleDownload(asset)}
                              disabled={!!downloadingId}
                              className="p-2 bg-black/50 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
                              aria-label="Download asset"
                              title="Download"
                          >
                            {downloadingId === asset.id ? <div className="w-4 h-4"><Spinner /></div> : <DownloadIcon className="h-4 w-4" />}
                          </button>
                          <button
                              onClick={() => handleShare(asset)}
                              className="p-2 bg-black/50 text-white rounded-full hover:bg-green-600 transition-colors"
                              aria-label="Share asset"
                              title="Share"
                          >
                              <ShareIcon className="h-4 w-4" />
                          </button>
                          <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(asset);
                              }}
                              disabled={!!deletingAssetId}
                              className="p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Delete asset"
                              title="Delete"
                          >
                              {deletingAssetId === asset.id ? (
                                  <div className="w-4 h-4"><Spinner /></div>
                              ) : (
                                  <TrashIcon className="h-4 w-4" />
                              )}
                          </button>
                      </div>
                      <div className="absolute bottom-0 left-0 p-4">
                        <p className="text-white font-bold text-sm capitalize">{asset.source_feature.replace(/_/g, ' ')}</p>
                        <p className="text-white/80 text-xs">{new Date(asset.created_at).toLocaleDateString()}</p>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryPage;