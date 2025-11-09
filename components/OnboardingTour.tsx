import React, { useState, useEffect } from 'react';

interface OnboardingTourProps {
  isVisible: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    targetId: 'virtual-photoshoot',
    title: '1 of 3: Your AI Photoshoot',
    content: 'Instantly swap garments and create stunning 4K try-on photos.',
    placement: 'bottom' as const,
  },
  {
    targetId: 'asset-generator',
    title: '2 of 3: E-commerce Asset Factory',
    content: 'Isolate and generate perfect ghost mannequin shots from any image.',
    placement: 'bottom' as const,
  },
  {
    targetId: 'catalog-forged',
    title: '3 of 3: The Product Perfection Tool',
    content: 'Remove wrinkles and noise to create flawless, marketplace-ready product shots.',
    placement: 'bottom' as const,
  },
];

type TooltipPosition = { top: number; left: number; width: number; height: number; };

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isVisible, onClose }) => {
  const [step, setStep] = useState(0); // 0: welcome, 1-3: features, 4: completion
  const [highlightPosition, setHighlightPosition] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    // Reset step when tour becomes visible after being hidden
    if (isVisible) {
      setStep(0);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || step === 0 || step > TOUR_STEPS.length) {
      document.body.style.overflow = 'auto';
      setHighlightPosition(null);
      return;
    }
    
    document.body.style.overflow = 'hidden'; // Prevent scrolling during tour

    const currentStepConfig = TOUR_STEPS[step - 1];
    const targetElement = document.querySelector(`[data-tour-id="${currentStepConfig.targetId}"]`);
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setHighlightPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose();
        if (e.key === 'ArrowRight' && step < TOUR_STEPS.length) handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'auto';
    };

  }, [step, isVisible]);

  const handleStart = () => setStep(1);
  const handleNext = () => setStep(s => Math.min(s + 1, TOUR_STEPS.length));
  const handleFinish = () => setStep(TOUR_STEPS.length + 1);
  const handleClose = () => onClose();

  if (!isVisible) return null;

  const currentStepConfig = step > 0 && step <= TOUR_STEPS.length ? TOUR_STEPS[step - 1] : null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={step > 0 ? undefined : handleClose} />
      
      {/* Highlight Box */}
      {highlightPosition && (
        <div
          className="fixed border-2 border-white rounded-3xl transition-all duration-300 ease-in-out shadow-2xl pointer-events-none"
          style={{
            top: highlightPosition.top - 8,
            left: highlightPosition.left - 8,
            width: highlightPosition.width + 16,
            height: highlightPosition.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          }}
        />
      )}

      {/* Welcome Modal */}
      {step === 0 && (
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center animate-fade-in-up">
            <h2 className="text-3xl font-bold text-[#2E1E1E] font-headline">Welcome to ZOLA AI</h2>
            <p className="mt-4 text-gray-600">The future of fashion content is here. Get ready to transform your photos with our AI-powered studio.</p>
            <div className="mt-8 flex flex-col sm:flex-row-reverse gap-4 justify-center">
              <button onClick={handleStart} className="px-8 py-3 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors">
                Start Tour
              </button>
              <button onClick={handleClose} className="text-gray-600 hover:text-black font-semibold py-2">
                Skip to App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {highlightPosition && currentStepConfig && (
        <div 
          className="fixed bg-white rounded-xl shadow-2xl p-5 max-w-xs w-full animate-fade-in-up"
          style={{
            top: highlightPosition.top + highlightPosition.height + 16,
            left: highlightPosition.left + highlightPosition.width / 2 - 160, // 160 is half of max-w-xs (320px)
          }}
        >
          <h3 className="font-bold text-lg text-[#2E1E1E]">{currentStepConfig.title}</h3>
          <p className="text-gray-600 mt-2 text-sm">{currentStepConfig.content}</p>
          <div className="mt-4 flex justify-end">
            {step < TOUR_STEPS.length ? (
              <button onClick={handleNext} className="px-5 py-2 bg-[#9F1D35] text-white font-semibold rounded-full text-sm hover:bg-[#80172a] transition-colors">
                Next
              </button>
            ) : (
              <button onClick={handleFinish} className="px-5 py-2 bg-[#9F1D35] text-white font-semibold rounded-full text-sm hover:bg-[#80172a] transition-colors">
                Finish Tour
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {step === TOUR_STEPS.length + 1 && (
         <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center animate-fade-in-up">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-[#2E1E1E] font-headline">You're all set!</h2>
            <p className="mt-4 text-gray-600">Ready to start creating?</p>
            <div className="mt-8">
              <button onClick={handleClose} className="px-8 py-3 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors">
                Let's Go!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingTour;