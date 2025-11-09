import React, { useState, useRef, useEffect } from 'react';
import { ImageFile } from '../types';
import { refineGeneratedImage, diagnoseAndSuggestRefinement } from '../services/virtualTryOnService';
import Spinner from './Spinner';

interface RefinementModalProps {
  userImage: ImageFile;
  garmentImage: ImageFile;
  initialGeneratedImage: string;
  onApply: (newImage: string) => void;
  onClose: () => void;
  gender: 'Male' | 'Female';
  garmentDescription: string;
}

const RefinementModal: React.FC<RefinementModalProps> = ({
  userImage,
  garmentImage,
  initialGeneratedImage,
  onApply,
  onClose,
  gender,
  garmentDescription
}) => {
  const [previewImage, setPreviewImage] = useState(initialGeneratedImage);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const imageRef = useRef<HTMLImageElement>(null);

  // State for conversational refinement
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);

  // New state for auto-diagnosis
  const [isDiagnosing, setIsDiagnosing] = useState(true);
  const [diagnosticResult, setDiagnosticResult] = useState<{ flawDetected: boolean; suggestion: string } | null>(null);


  // Add keyboard listener for Esc key and run diagnostics on mount
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Auto-diagnose the initial image
    const runDiagnostics = async () => {
        if (!userImage || !garmentImage) return;

        const generatedImageFile: ImageFile = {
            dataUrl: initialGeneratedImage,
            base64: initialGeneratedImage.split(',')[1],
            mimeType: 'image/png' // Assume PNG for generated images
        };
        
        setIsDiagnosing(true);
        try {
            const result = await diagnoseAndSuggestRefinement(
                userImage,
                garmentImage,
                generatedImageFile,
                garmentDescription
            );
            setDiagnosticResult(result);
        } catch (err) {
            console.error("Auto-diagnosis failed:", err);
            setDiagnosticResult({ flawDetected: false, suggestion: '' }); // Default to no flaw on error
        } finally {
            setIsDiagnosing(false);
        }
    };
    
    runDiagnostics();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, userImage, garmentImage, initialGeneratedImage, garmentDescription]);

  const handleApplyChanges = () => {
    const image = imageRef.current;
    if (!image) return;
    
    const canvas = document.createElement('canvas');
    // Use naturalWidth/Height to get original dimensions of the image source
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // The previewImage already has the AI edits. The filter is just a CSS effect on top.
    // So we draw the current previewImage to the canvas and apply the filter.
    const imgToDraw = new Image();
    imgToDraw.crossOrigin = 'anonymous';
    imgToDraw.src = previewImage;
    imgToDraw.onload = () => {
        ctx.filter = `saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`;
        ctx.drawImage(imgToDraw, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        onApply(dataUrl);
    };
  };
  
  const handleRefineWithPrompt = async () => {
    if (!refinementPrompt.trim()) {
      setRefinementError("Please enter a refinement instruction.");
      return;
    }
    
    setIsRefining(true);
    setRefinementError(null);
    
    // Create an ImageFile object for the current preview image
    const currentImageFile: ImageFile = {
      dataUrl: previewImage,
      base64: previewImage.split(',')[1],
      mimeType: 'image/png',
    };

    try {
      if(!userImage || !garmentImage) {
        throw new Error("User or garment image is missing.");
      }
      const resultBase64 = await refineGeneratedImage(currentImageFile, refinementPrompt, gender, garmentDescription);
      const newImageUrl = `data:image/png;base64,${resultBase64}`;
      setPreviewImage(newImageUrl);
      setRefinementPrompt('');
      // Reset sliders as they were for the previous image
      setSaturation(100);
      setBrightness(100);
      setContrast(100);
    } catch (err) {
      console.error(err);
      setRefinementError((err as Error).message || "Failed to refine image.");
    } finally {
      setIsRefining(false);
    }
  };

  const Slider: React.FC<{label: string, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, onChange }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="range"
        min="0"
        max="200"
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#9F1D35]"
      />
    </div>
  );
  
  const placeholderText = diagnosticResult?.flawDetected 
    ? "Use the suggested fix or write your own."
    : "Looks good! How would you like me to refine this? (e.g., 'make the collar straighter')";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-full max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Refine Your Look</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex-grow flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
          {/* Controls Panel */}
          <div className="w-full md:w-80 lg:w-96 bg-gray-50 rounded-xl p-5 flex flex-col gap-6 overflow-y-auto">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 text-lg">Style | Converse with Auto-Diagnose</h3>
              
              {isDiagnosing ? (
                <div className="flex items-center text-sm text-gray-500 p-2 bg-gray-100 rounded-md mb-4">
                    <Spinner />
                    <span className="ml-2">Running auto-diagnosis...</span>
                </div>
              ) : diagnosticResult?.flawDetected ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-md mb-4 animate-fade-in">
                    <p className="text-sm font-semibold text-yellow-800">AI Auto-Diagnosis:</p>
                    <p className="text-sm text-yellow-700 mt-1">A potential issue was found. We've suggested a one-click fix to improve the result.</p>
                    <button
                        onClick={() => {
                            if (diagnosticResult.suggestion) {
                                setRefinementPrompt(diagnosticResult.suggestion);
                            }
                        }}
                        className="w-full mt-3 px-4 py-2 text-sm bg-yellow-400 text-yellow-900 font-semibold rounded-lg shadow-sm hover:bg-yellow-500 transition-colors"
                    >
                        Apply Suggested Fix
                    </button>
                </div>
              ) : (
                <p className="text-sm text-gray-600 mb-4">Describe the change you want to see. For example, "make the shirt sleeves longer" or "change the background to a sunny beach".</p>
              )}

              <textarea
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                placeholder={placeholderText}
                className="w-full h-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9F1D35] focus:border-transparent"
                rows={3}
                disabled={isRefining}
              />
              <button
                onClick={handleRefineWithPrompt}
                disabled={isRefining || !refinementPrompt.trim()}
                className="w-full mt-3 px-4 py-2.5 bg-[#2E1E1E] text-white font-semibold rounded-lg shadow-md hover:bg-black transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isRefining ? <Spinner/> : 'Refine with AI'}
              </button>
              {refinementError && <p className="text-red-500 text-xs mt-2">{refinementError}</p>}
            </div>

            <hr className="border-gray-200" />
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 text-lg">Color & Light</h3>
              <div className="space-y-4">
                <Slider label="Brightness" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />
                <Slider label="Contrast" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />
                <Slider label="Saturation" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Image Preview Panel */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto p-2">
            <div className="flex flex-col items-center">
              <p className="mb-2 text-sm font-semibold text-gray-600">Source Person</p>
              <img src={userImage?.dataUrl} alt="Original" className="w-full h-auto object-contain rounded-lg max-h-[70vh] border"/>
            </div>
            <div className="flex flex-col items-center">
              <p className="mb-2 text-sm font-semibold text-gray-600">Source Garment</p>
              <img src={garmentImage?.dataUrl} alt="Garment" className="w-full h-auto object-contain rounded-lg max-h-[70vh] border"/>
            </div>
            <div className="flex flex-col items-center relative">
              <p className="mb-2 text-sm font-semibold text-[#9F1D35]">Editable Result</p>
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  ref={imageRef}
                  src={previewImage}
                  alt="Preview"
                  className="w-full h-auto object-contain rounded-lg transition-all duration-200 max-h-[70vh] border-2 border-[#9F1D35]"
                  style={{ filter: `saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`}}
                  crossOrigin="anonymous" // Required for canvas operations
                />
              </div>
            </div>
          </div>
        </div>
        
        <footer className="flex justify-end p-4 border-t bg-gray-50/50 rounded-b-2xl gap-3">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-full shadow-sm hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleApplyChanges} className="px-6 py-2.5 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors">
            Apply Changes
          </button>
        </footer>
      </div>
    </div>
  );
};

export default RefinementModal;