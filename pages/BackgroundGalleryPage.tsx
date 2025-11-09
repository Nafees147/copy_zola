import React, { useState, useEffect } from 'react';
import { ImageFile } from '../types';
import { BACKGROUNDS, Background } from '../services/backgrounds';
import { changeBackgroundImage } from '../services/styleSceneService';
import { uploadStyleSceneImage } from '../services/db';
import Spinner from '../components/Spinner';
import { DownloadIcon } from '../components/icons';

interface BackgroundGalleryPageProps {
  onBack: () => void;
}

export interface CollectionItem {
    id: string; // background id
    imageUrl: string;
}

const urlToImageFile = async (url: string, options?: { maxWidth: number; maxHeight: number }): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Required to draw cross-origin images to a canvas
        img.onload = () => {
            // If no resizing options are provided, return the original image data
            if (!options) {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));
                ctx.drawImage(img, 0, 0);
                const mimeType = url.endsWith('.png') ? 'image/png' : 'image/jpeg';
                const dataUrl = canvas.toDataURL(mimeType);
                const base64 = dataUrl.split(',')[1];
                resolve({ dataUrl, base64, mimeType });
                return;
            }

            // Apply resizing logic if options are provided
            let { naturalWidth: width, naturalHeight: height } = img;
            const ratio = width / height;

            if (width > options.maxWidth) {
                width = options.maxWidth;
                height = Math.round(width / ratio);
            }

            if (height > options.maxHeight) {
                height = options.maxHeight;
                width = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));
            
            ctx.drawImage(img, 0, 0, width, height);
            
            const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG for smaller size
            const resizedBase64 = resizedDataUrl.split(',')[1];
            
            resolve({
                dataUrl: resizedDataUrl,
                base64: resizedBase64,
                mimeType: 'image/jpeg'
            });
        };
        img.onerror = (err) => reject(new Error(`Image loading failed from URL: ${url}. Error: ${err}`));
        img.src = url;
    });
};


const BackgroundGalleryPage: React.FC<BackgroundGalleryPageProps> = ({ onBack }) => {
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [poseId, setPoseId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<CollectionItem | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [applyingBackgroundId, setApplyingBackgroundId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const imageUrl = sessionStorage.getItem('image_for_background_change');
    const pId = sessionStorage.getItem('poseId_for_background_change');
    const uId = sessionStorage.getItem('stylescene_user_id');
    const existingCollectionJSON = sessionStorage.getItem('existing_collection_for_pose');
    
    setSourceImageUrl(imageUrl);
    setPoseId(pId);
    setUserId(uId);
    if (existingCollectionJSON) {
        try {
            setCollection(JSON.parse(existingCollectionJSON));
        } catch (e) {
            console.error("Failed to parse existing collection from sessionStorage", e);
        }
    }

    // Clean up session storage on component unmount
    return () => {
        sessionStorage.removeItem('image_for_background_change');
        sessionStorage.removeItem('poseId_for_background_change');
        sessionStorage.removeItem('stylescene_user_id');
        sessionStorage.removeItem('existing_collection_for_pose');
    };
  }, []);

  const handleApplyBackground = async (background: Background) => {
    if (!sourceImageUrl || !userId || !poseId || applyingBackgroundId) return;

    setApplyingBackgroundId(background.id);
    setError(null);
    setGeneratedImage(null);

    try {
        const [subjectImageFile, backgroundImageFile] = await Promise.all([
            urlToImageFile(sourceImageUrl, { maxWidth: 1024, maxHeight: 1024 }),
            urlToImageFile(background.url, { maxWidth: 1536, maxHeight: 1536 })
        ]);

        const resultBase64 = await changeBackgroundImage(subjectImageFile, backgroundImageFile);
        const newImageUrl = await uploadStyleSceneImage(userId, poseId, resultBase64);
        setGeneratedImage({ id: background.id, imageUrl: newImageUrl });

    } catch (err) {
        console.error("Failed to apply background:", err);
        setError((err as Error).message || "An unknown error occurred while changing the background.");
    } finally {
        setApplyingBackgroundId(null);
    }
  };
  
  const handleAddToCollection = () => {
    if (!generatedImage) return;
    setCollection(prev => [...prev, generatedImage]);
    setGeneratedImage(null);
  };

  const handleBack = () => {
    if (poseId) {
        // Pass the updated collection and the last image URL back to the main page
        sessionStorage.setItem('updated_image_collection', JSON.stringify(collection));
        
        if (collection.length > 0) {
            const lastImageUrl = collection[collection.length - 1].imageUrl;
            sessionStorage.setItem('updated_image_url', lastImageUrl);
        } else {
            sessionStorage.setItem('updated_image_url', 'null');
        }
        
        sessionStorage.setItem('updated_image_pose_id', poseId);
    } else {
        console.warn("Cannot save background collection state: poseId is missing.");
    }
    onBack();
  };

  const handleDownload = async (imageUrl: string, bgId: string) => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `campaign-image-with-${bgId}-background.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Download failed:", err);
        setError("Could not download the image. Please try again.");
    }
  };

  if (!sourceImageUrl) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <Spinner />
            <p className="mt-4 text-gray-600">Loading editor...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-[#2E1E1E]">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold font-headline">Background Editor</h1>
            <p className="text-gray-600 text-sm">Select a new background for your image</p>
          </div>
          <button onClick={handleBack} className="px-6 py-2.5 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors">
            &larr; Back to Campaign
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row p-4 sm:p-6 lg:p-8 gap-8">
        {/* Left Panel: Source Image */}
        <div className="lg:w-1/3 flex-shrink-0">
          <div className="sticky top-24">
            <h2 className="font-bold text-lg text-center mb-4 text-gray-700">Image to Edit</h2>
            <div className="aspect-[4/5] bg-white rounded-2xl shadow-lg overflow-hidden border">
                <img src={sourceImageUrl} alt="Source for background change" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
        
        {/* Right Panel: Backgrounds & Result */}
        <div className="flex-1 min-w-0">
          <section>
            <h2 className="font-bold text-lg text-gray-700 mb-4">Choose a Background</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 custom-scrollbar pr-2" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
              {BACKGROUNDS.map(bg => (
                <div key={bg.id} className="group">
                    <div className="relative aspect-[3/4] bg-gray-200 rounded-xl shadow-md overflow-hidden border-2 border-transparent group-hover:border-[#9F1D35] transition-all">
                        <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" loading="lazy"/>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                             <button
                                onClick={() => handleApplyBackground(bg)}
                                disabled={!!applyingBackgroundId}
                                className="w-full px-4 py-2 bg-white/90 text-[#9F1D35] font-bold rounded-full shadow-lg text-sm hover:bg-white disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-wait"
                            >
                                {applyingBackgroundId === bg.id ? <div className="flex justify-center"><Spinner/></div> : 'Apply'}
                            </button>
                        </div>
                    </div>
                     <p className="mt-2 text-xs text-gray-600 font-semibold text-center truncate" title={bg.name}>{bg.name}</p>
                </div>
              ))}
            </div>
          </section>

          {(generatedImage || applyingBackgroundId || error) && (
            <section className="mt-8 pt-8 border-t">
              <h2 className="font-bold text-lg text-gray-700 mb-4 text-center">Generated Image</h2>
              <div className="flex flex-col items-center">
                  {error && <div className="p-4 w-full max-w-lg bg-red-100 border border-red-400 text-red-700 rounded-lg text-center mb-4"><p>{error}</p></div>}
                  {applyingBackgroundId && !generatedImage && <div className="w-full max-w-lg h-96 flex flex-col items-center justify-center bg-gray-100 rounded-xl border-dashed border-2"><Spinner /><p className="mt-3 text-gray-500">Applying background...</p></div>}
                  {generatedImage && (
                    <div className="w-full max-w-lg animate-fade-in">
                        <div className="aspect-[4/5] bg-white rounded-2xl shadow-lg overflow-hidden border">
                            <img src={generatedImage.imageUrl} alt="Generated with new background" className="w-full h-full object-contain"/>
                        </div>
                        <button onClick={handleAddToCollection} className="w-full mt-4 flex items-center justify-center px-6 py-3 bg-[#2E1E1E] text-white font-semibold rounded-full shadow-md hover:bg-black transition-colors">
                            Add to Collection
                        </button>
                    </div>
                  )}
              </div>
            </section>
          )}

          {collection.length > 0 && (
            <section className="mt-8 pt-8 border-t">
              <h2 className="font-bold text-lg text-gray-700 mb-4">Generated Collection</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                {collection.map((item, index) => (
                  <div key={index} className="group relative aspect-[4/5] bg-gray-100 rounded-xl shadow-md overflow-hidden">
                    <img src={item.imageUrl} alt={`Variation ${index + 1}`} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleDownload(item.imageUrl, item.id)}
                        className="flex items-center justify-center p-2.5 bg-white/90 text-gray-800 font-semibold rounded-full shadow-lg hover:bg-white"
                        title="Download Image"
                      >
                        <DownloadIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default BackgroundGalleryPage;