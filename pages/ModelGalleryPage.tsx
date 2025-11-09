import React, { useState, useEffect } from 'react';
import { ALL_MODELS, Model } from '../services/models';

interface ModelGalleryPageProps {
  onBack: () => void;
}

const ModelGalleryPage: React.FC<ModelGalleryPageProps> = ({ onBack }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);

  useEffect(() => {
    const galleryGender = sessionStorage.getItem('model_gallery_gender') as 'Male' | 'Female' | null;
    if (galleryGender) {
      setFilteredModels(ALL_MODELS.filter(m => m.gender === galleryGender));
    }
  }, []);

  const handleConfirm = () => {
    if (selectedId) {
      sessionStorage.setItem('selected_model_id', selectedId);
      onBack();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#2E1E1E]">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold font-headline">The Model Studio</h1>
            <p className="text-gray-600 text-sm">Select a model for your campaign</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="px-5 py-2.5 bg-gray-100 text-sm text-gray-700 font-semibold rounded-full shadow-sm hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedId}
              className="px-6 py-2.5 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Confirm & Apply
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {filteredModels.map(model => (
            <div key={model.id} className="flex flex-col">
              <button
                onClick={() => setSelectedId(model.id)}
                onMouseEnter={() => setHoveredId(model.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`relative group w-full aspect-[4/5] block border-4 rounded-2xl shadow-lg overflow-hidden transition-all duration-200 focus:outline-none ${selectedId === model.id ? 'border-[#9F1D35] ring-4 ring-[#9F1D35]/30' : 'border-transparent hover:border-gray-400'}`}
              >
                <img
                    src={model.fullBodyUrl}
                    alt={model.label}
                    className={`w-full h-full object-cover absolute inset-0 transition-transform duration-300 group-hover:scale-105 ${hoveredId === model.id ? 'hidden' : 'block'}`}
                />
                <img
                    src={model.closeUpUrl}
                    alt={model.label}
                    className={`w-full h-full object-cover absolute inset-0 transition-transform duration-300 group-hover:scale-105 ${hoveredId === model.id ? 'block' : 'hidden'}`}
                />
                 {selectedId === model.id && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-[#9F1D35] text-white rounded-full h-12 w-12 flex items-center justify-center ring-4 ring-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                )}
              </button>
              <div className="p-2 mt-2 text-center">
                <h2 className="font-bold text-lg text-[#2E1E1E]">{model.label}</h2>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ModelGalleryPage;