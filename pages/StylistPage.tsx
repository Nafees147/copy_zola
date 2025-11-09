import React, { useState } from 'react';
import { User, ImageFile } from '../types';
import ImageUploader from '../components/ImageUploader';
import { UserIcon } from '../components/icons';
import { generateModularOutfit, analyzeGarmentList } from '../services/stylistService';
import Spinner from '../components/Spinner';

interface StylistPageProps {
  user: User;
}

const GARMENT_TYPES = [
  { id: 'shirt', name: 'Shirt/Top' },
  { id: 'pants', name: 'Pants/Bottom' },
  { id: 'shoes', name: 'Shoes/Slippers' },
  { id: 'watch', name: 'Watch' },
  { id: 'bracelet', name: 'Bracelet' },
  { id: 'chain', name: 'Chain' },
  { id: 'cap', name: 'Cap' },
  { id: 'handbag', name: 'Handbag' },
  { id: 'earrings', name: 'Earrings' },
] as const;

type GarmentId = typeof GARMENT_TYPES[number]['id'];

const StylistPage: React.FC<StylistPageProps> = ({ user }) => {
  const [personImage, setPersonImage] = useState<ImageFile>(null);
  const [selectedItems, setSelectedItems] = useState<Record<GarmentId, boolean>>({
    shirt: false, pants: false, shoes: false, watch: false, bracelet: false,
    chain: false, cap: false, handbag: false, earrings: false
  });
  const [itemImages, setItemImages] = useState<Record<GarmentId, ImageFile>>({
    shirt: null, pants: null, shoes: null, watch: null, bracelet: null,
    chain: null, cap: null, handbag: null, earrings: null
  });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckboxChange = (id: GarmentId) => {
    setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleItemImageUpload = (id: GarmentId, file: ImageFile) => {
    setItemImages(prev => ({...prev, [id]: file }));
  }

  const getSelectedGarmentIds = (): GarmentId[] => {
    return Object.entries(selectedItems)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id as GarmentId);
  };
  
  const canGenerate = () => {
    if (!personImage) return false;
    const selectedIds = getSelectedGarmentIds();
    if (selectedIds.length === 0) return false;
    return selectedIds.every(id => itemImages[id] !== null);
  };

  const handleGenerate = async () => {
    if (!canGenerate()) {
      setError('Please upload your photo and an image for every selected item.');
      return;
    }
    setError(null);
    setGeneratedImage(null);

    const itemsToProcess = getSelectedGarmentIds()
      .map(id => {
        const image = itemImages[id];
        const typeInfo = GARMENT_TYPES.find(t => t.id === id);
        return image && typeInfo ? { image, type: typeInfo.name } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (!personImage || itemsToProcess.length === 0) {
      setError("Missing person image or item images.");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Stage 1: Analyze Garments
      const itemImagesToAnalyze = itemsToProcess.map(item => item.image);
      const itemDescriptions = await analyzeGarmentList(itemImagesToAnalyze);
      
      setIsAnalyzing(false);
      setIsLoading(true);
      
      // Stage 2: Generate Composite Image
      const resultBase64 = await generateModularOutfit(personImage, itemsToProcess, itemDescriptions);
      setGeneratedImage(`data:image/png;base64,${resultBase64}`);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };
  
  const handleStartOver = () => {
    setPersonImage(null);
    setSelectedItems({ shirt: false, pants: false, shoes: false, watch: false, bracelet: false, chain: false, cap: false, handbag: false, earrings: false });
    setItemImages({ shirt: null, pants: null, shoes: null, watch: null, bracelet: null, chain: null, cap: null, handbag: null, earrings: null });
    setGeneratedImage(null);
    setError(null);
    setIsLoading(false);
    setIsAnalyzing(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-gray-200/50">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#2E1E1E] font-headline">AI Stylist & Modular Builder</h1>
          <p className="text-gray-600 mt-2 text-lg">The "Layering" Tool</p>
        </div>

        {!generatedImage && !isLoading && !isAnalyzing && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side: Uploads & Selections */}
            <div>
              {/* Step 1: Upload Person */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-700 mb-3">Step 1: Upload Your Photo</h2>
                {!personImage ? (
                  <div className="max-w-xs">
                    <ImageUploader id="person-image" title="Upload Person" onImageUpload={setPersonImage} icon={<UserIcon />} currentFile={personImage} />
                  </div>
                ) : (
                  <div className="relative group w-48">
                    <img src={personImage.dataUrl} alt="Person" className="rounded-xl shadow-md w-full object-cover aspect-[4/5]" />
                    <button onClick={() => setPersonImage(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Select Items */}
              {personImage && (
                <div className="mb-6 animate-fade-in">
                  <h2 className="text-xl font-bold text-gray-700 mb-3">Step 2: Select Items to Add</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {GARMENT_TYPES.map(item => (
                      <label key={item.id} className="flex items-center p-3 bg-gray-50 rounded-lg border has-[:checked]:bg-[#9F1D35]/5 has-[:checked]:border-[#9F1D35]/50 cursor-pointer transition-colors">
                        <input type="checkbox" checked={selectedItems[item.id]} onChange={() => handleCheckboxChange(item.id)} className="h-4 w-4 rounded border-gray-300 text-[#9F1D35] focus:ring-[#9F1D35]" />
                        <span className="ml-3 text-sm font-medium text-gray-700">{item.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Side: Item Uploaders */}
            <div>
            {personImage && getSelectedGarmentIds().length > 0 && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-bold text-gray-700 mb-3">Step 3: Upload Item Images</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {getSelectedGarmentIds().map(id => {
                    const item = GARMENT_TYPES.find(g => g.id === id)!;
                    return (
                      <ImageUploader key={id} id={`item-${id}`} title={item.name} onImageUpload={(file) => handleItemImageUpload(id, file)} icon={<div className="w-8 h-8 text-gray-400 flex items-center justify-center text-xs font-bold">{item.name.slice(0, 2)}</div>} currentFile={itemImages[id]} />
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {(isLoading || isAnalyzing || generatedImage) && (
          <div className="text-center py-8">
            {(isLoading || isAnalyzing) && (
              <div>
                <div className="flex justify-center"><Spinner /></div>
                <p className="mt-4 text-lg text-gray-600 animate-pulse">
                  {isAnalyzing ? 'Analyzing garments...' : 'Your AI Stylist is building the outfit...'}
                </p>
                <p className="text-sm text-gray-500 mt-2">This may take a moment.</p>
              </div>
            )}
            {generatedImage && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Your Custom Outfit</h2>
                <div className="flex justify-center">
                  <img src={generatedImage} alt="Generated Outfit" className="rounded-xl shadow-lg max-w-lg w-full" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col items-center">
          {!generatedImage ? (
            <>
              <button onClick={handleGenerate} disabled={!canGenerate() || isLoading || isAnalyzing} className="px-12 py-4 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9F1D35] transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none">
                {isLoading || isAnalyzing ? 'Generating...' : 'Generate Outfit'}
              </button>
              {error && <p className="mt-4 text-red-600">{error}</p>}
            </>
          ) : (
            <button onClick={handleStartOver} className="text-[#9F1D35] hover:text-[#80172a] font-semibold">
              Start Over
            </button>
          )}
        </div>
      </main>

      <footer className="text-center mt-8 text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} ZOLA AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default StylistPage;