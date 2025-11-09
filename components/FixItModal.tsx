import React, { useState } from 'react';
import Spinner from './Spinner';

interface GeneratedImageResult {
  imageUrl: string;
  poseName: string;
  poseId: string;
  sourceView: 'front' | 'back';
}

interface FixItModalProps {
  imageInfo: GeneratedImageResult;
  onClose: () => void;
  onRegenerate: (poseId: string, fixInstruction: string) => Promise<void>;
}

const FIX_REASONS = [
  { id: 'face', label: "The model's face is incorrect.", instruction: "The generated model's face, hair, and physical appearance do not match the 'Model Identity Image'. Please regenerate, ensuring an exact, photorealistic replica of the model's identity." },
  { id: 'pose', label: "The model's pose is incorrect.", instruction: "The generated model's pose does not match the 'Pose Reference Image'. Please regenerate, ensuring the final pose is a 100% accurate replication of the reference pose." },
  { id: 'background', label: "The background is wrong.", instruction: "The generated background does not match the 'Background Image'. Please regenerate, ensuring the background is an exact replica of the provided scene." },
  { id: 'outfit', label: "The outfit doesn't match the source garment.", instruction: "The generated garment does not match the 'Garment Image' in terms of color, pattern, or style. Please regenerate, ensuring the garment is a perfect replica of the source." },
  { id: 'other', label: "Other..." },
];

const FixItModal: React.FC<FixItModalProps> = ({ imageInfo, onClose, onRegenerate }) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setError("Please select a reason for the fix.");
      return;
    }
    
    let fixInstruction = '';
    if (selectedReason === 'other') {
      if (!otherText.trim()) {
        setError("Please describe the issue.");
        return;
      }
      fixInstruction = otherText.trim();
    } else {
      fixInstruction = FIX_REASONS.find(r => r.id === selectedReason)?.instruction || '';
    }

    if (!fixInstruction) {
        setError("Could not generate a fix instruction.");
        return;
    }
    
    setError(null);
    setIsRegenerating(true);
    await onRegenerate(imageInfo.poseId, fixInstruction);
    // The parent will handle closing the modal on completion/error
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Fix This Image</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="flex-grow flex flex-col md:flex-row p-6 gap-6 overflow-hidden">
            <div className="md:w-1/2 flex-shrink-0">
              <img src={imageInfo.imageUrl} alt={imageInfo.poseName} className="w-full h-auto object-contain rounded-lg border max-h-[60vh]" />
            </div>
            <div className="md:w-1/2 flex flex-col">
              <h3 className="font-semibold text-gray-800 mb-3 text-lg">What needs to be fixed?</h3>
              <div className="space-y-3">
                {FIX_REASONS.map(reason => (
                  <label key={reason.id} className="flex items-center p-3 bg-gray-50 rounded-lg border-2 has-[:checked]:border-[#9F1D35] has-[:checked]:bg-[#9F1D35]/5 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="fix-reason"
                      value={reason.id}
                      checked={selectedReason === reason.id}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="h-4 w-4 text-[#9F1D35] focus:ring-[#9F1D35] border-gray-300"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">{reason.label}</span>
                  </label>
                ))}
              </div>
              {selectedReason === 'other' && (
                <textarea
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Describe the issue... (e.g., 'Make the lighting brighter')"
                  className="mt-3 w-full h-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9F1D35] focus:border-transparent animate-fade-in"
                  rows={3}
                  disabled={isRegenerating}
                />
              )}
               {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </div>
          </div>
          
          <footer className="flex justify-end p-4 border-t bg-gray-50/50 rounded-b-2xl gap-3">
            <button type="button" onClick={onClose} disabled={isRegenerating} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-full shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isRegenerating || !selectedReason} className="px-6 py-2.5 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isRegenerating ? <><Spinner /> <span className="ml-2">Regenerating...</span></> : 'Regenerate Image'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default FixItModal;