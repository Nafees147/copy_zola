import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageFile, User, GeneratedAsset } from '../types';
import { generateVirtualTryOn, analyzeGarmentImage, detectGender, detectGarmentGender } from '../services/virtualTryOnService';
import { classifyGarmentsInImage } from '../services/assetGeneratorService';
import { saveImage, getImage, deleteImage } from '../services/imageStore';
import ImageUploader from '../components/ImageUploader';
import Spinner from '../components/Spinner';
import { UserIcon, GarmentIcon, DownloadIcon, SaveIcon, RefineIcon, ShareIcon, MaleIcon, FemaleIcon, AssetGeneratorIcon } from '../components/icons';
import RefinementModal from '../components/RefinementModal';
import { PATHS } from '../constants/paths';

interface TryOnPageProps {
  user: User;
  onSave: (generatedImage: string) => void;
}

// Helper function to convert data URL to File, useful for Web Share API
const dataURLtoFile = async (dataUrl: string, filename:string): Promise<File | null> => {
  try {
    const res = await fetch(dataUrl);
    const blob: Blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error('Error converting data URL to File:', error);
    return null;
  }
}

const dataUrlToImageFile = (dataUrl: string): ImageFile => {
    if (!dataUrl) return null;
    const parts = dataUrl.split(',');
    const mimeTypePart = parts[0].match(/:(.*?);/);
    if (!mimeTypePart || parts.length < 2 || !parts[1]) {
        console.error("Invalid data URL format");
        return null;
    }
    
    return {
        dataUrl: dataUrl,
        base64: parts[1],
        mimeType: mimeTypePart[1],
    };
};

const TryOnPage: React.FC<TryOnPageProps> = ({ user, onSave }) => {
  const [gender, setGender] = useState<'Male' | 'Female' | null>(null);
  const [userImage, setUserImage] = useState<ImageFile>(null);
  const [garmentImage, setGarmentImage] = useState<ImageFile>(null);
  const [garmentDescription, setGarmentDescription] = useState<string>('');
  const [garmentSuggestions, setGarmentSuggestions] = useState<string[]>([]);
  const [isAnalyzingGarment, setIsAnalyzingGarment] = useState<boolean>(false);
  const [backgroundOption, setBackgroundOption] = useState<'studio' | 'white' | 'outdoor' | 'original'>('studio');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9'>('4:5');
  const [swapUpperBody, setSwapUpperBody] = useState<boolean>(false);
  const [swapLowerBody, setSwapLowerBody] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStateLoading, setIsStateLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string>('Share');
  const navigate = useNavigate();

  // State for new validation warnings
  const [genderWarning, setGenderWarning] = useState<string | null>(null);
  const [garmentSwapWarning, setGarmentSwapWarning] = useState<string | null>(null);
  const [garmentGenderWarning, setGarmentGenderWarning] = useState<string | null>(null);
  const [garmentClassification, setGarmentClassification] = useState<{ upperBody: boolean, lowerBody: boolean } | null>(null);

  // User-specific storage keys
  const SESSION_STORAGE_KEY = `virtualPhotoshootState_${user.id}`;
  const USER_IMAGE_KEY = `tryon-user-image_${user.id}`;
  const GARMENT_IMAGE_KEY = `tryon-garment-image_${user.id}`;

  // Load state on mount, handling bridged data first.
  useEffect(() => {
    const bridgedDataUrl = sessionStorage.getItem('bridge_image_to_tryon');

    const processBridgedData = async () => {
        // If bridging, this is a new user action. Clear any saved state for THIS user.
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        await deleteImage(USER_IMAGE_KEY);
        await deleteImage(GARMENT_IMAGE_KEY);

        const imageFile = dataUrlToImageFile(bridgedDataUrl!);
        if (imageFile) {
            handleGarmentImageUpload(imageFile); // Use handler to trigger analysis
        }
        sessionStorage.removeItem('bridge_image_to_tryon');
        setIsStateLoading(false); // Done loading bridged data
    };

    if (bridgedDataUrl) {
      processBridgedData();
    } else {
      // Otherwise, load saved state.
      const loadState = async () => {
        try {
          const savedStateJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
          if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);

            // Restore setup state
            if (savedState.gender) setGender(savedState.gender);
            if (savedState.garmentDescription) setGarmentDescription(savedState.garmentDescription);
            if (savedState.garmentSuggestions) setGarmentSuggestions(savedState.garmentSuggestions);
            if (savedState.garmentClassification) setGarmentClassification(savedState.garmentClassification);
            if (savedState.backgroundOption) setBackgroundOption(savedState.backgroundOption);
            if (savedState.aspectRatio) setAspectRatio(savedState.aspectRatio);
            if (savedState.swapUpperBody) setSwapUpperBody(savedState.swapUpperBody);
            if (savedState.swapLowerBody) setSwapLowerBody(savedState.swapLowerBody);
            
            // Restore results state
            if (savedState.isSaved) setIsSaved(savedState.isSaved);

            // Restore images from IndexedDB concurrently
            const [userImg, garmentImg, genImg] = await Promise.all([
                savedState.userImageKey ? getImage(savedState.userImageKey) : Promise.resolve(null),
                savedState.garmentImageKey ? getImage(savedState.garmentImageKey) : Promise.resolve(null),
                savedState.generatedImageKey ? getImage(`tryon-generated-image_${user.id}`) : Promise.resolve(null)
            ]);

            setUserImage(userImg);
            setGarmentImage(garmentImg);
            if(genImg) {
                setGeneratedImage(genImg.dataUrl);
            }
          }
        } catch (error) {
          console.error("Failed to load state from sessionStorage", error);
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } finally {
            setIsStateLoading(false);
        }
      };
      loadState();
    }
  }, [user.id]);

  // Save state on change
  useEffect(() => {
    // Prevent saving state until the initial load is complete.
    if (isStateLoading) return;

    const saveState = async () => {
        try {
            // Define user-specific keys inside the effect
            const USER_IMAGE_KEY = `tryon-user-image_${user.id}`;
            const GARMENT_IMAGE_KEY = `tryon-garment-image_${user.id}`;
            const GENERATED_IMAGE_KEY = `tryon-generated-image_${user.id}`;

            // Save all images to IndexedDB and get their keys for session storage
            if (userImage) await saveImage(USER_IMAGE_KEY, userImage);
            else await deleteImage(USER_IMAGE_KEY);

            if (garmentImage) await saveImage(GARMENT_IMAGE_KEY, garmentImage);
            else await deleteImage(GARMENT_IMAGE_KEY);
            
            if (generatedImage) {
                const generatedImageFile = dataUrlToImageFile(generatedImage);
                if (generatedImageFile) await saveImage(GENERATED_IMAGE_KEY, generatedImageFile);
            } else {
                await deleteImage(GENERATED_IMAGE_KEY);
            }
            
            // Save all serializable state to session storage
            const stateToSave = {
                gender,
                userImageKey: userImage ? USER_IMAGE_KEY : null,
                garmentImageKey: garmentImage ? GARMENT_IMAGE_KEY : null,
                garmentDescription,
                garmentSuggestions,
                garmentClassification,
                backgroundOption,
                aspectRatio,
                swapUpperBody,
                swapLowerBody,
                generatedImageKey: generatedImage ? GENERATED_IMAGE_KEY : null,
                isSaved,
            };
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save state:", error);
        }
    };
    
    // Don't save while loading to avoid inconsistent states on refresh
    if (!isLoading) {
        saveState();
    }
  }, [
    isStateLoading, gender, userImage, garmentImage, garmentDescription, garmentSuggestions,
    garmentClassification, backgroundOption, aspectRatio, swapUpperBody,
    swapLowerBody, generatedImage, isLoading, isSaved, user.id
  ]);

  useEffect(() => {
    if (!garmentImage) {
      // No cleanup needed here as handleGarmentImageUpload(null) handles it
      return;
    }
    
    // Only run analysis if a garment is present but we have no description for it.
    // This prevents re-running the analysis when loading saved state from session.
    if (garmentDescription) {
        return;
    }

    const analyzeAndClassifyGarment = async () => {
      setIsAnalyzingGarment(true);
      setError(null);
      try {
        // Run sequentially to reduce concurrent requests and avoid rate-limiting
        const analysis = await analyzeGarmentImage(garmentImage);
        const classification = await classifyGarmentsInImage(garmentImage);
        
        setGarmentDescription(analysis.description);
        setGarmentSuggestions(analysis.suggestions || []);
        setGarmentClassification(classification);
      } catch (err) {
        setError('Could not analyze garment. Please try another image or describe it manually.');
        console.error(err);
      } finally {
        setIsAnalyzingGarment(false);
      }
    }
    analyzeAndClassifyGarment();
  }, [garmentImage, garmentDescription]);

  useEffect(() => {
    if (garmentDescription) {
      const desc = garmentDescription.toLowerCase();
      const isFullBodyItem = ['dress', 'gown', 'suit', 'kurti', 'anarkali', 'sherwani'].some(keyword => desc.includes(keyword));
      if (isFullBodyItem) {
        setSwapUpperBody(true);
        setSwapLowerBody(true);
      }
    }
  }, [garmentDescription]);

  useEffect(() => {
    const validateGender = async () => {
        if (gender && userImage) {
            try {
                const detectedGender = await detectGender(userImage);
                if (detectedGender !== 'Unknown' && detectedGender !== gender) {
                    setGenderWarning(`Warning: Your selected gender is '${gender}', but the photo appears to be of a '${detectedGender}' person. Please correct the selection.`);
                } else {
                    setGenderWarning(null);
                }
            } catch (err) {
                console.error("Gender detection failed:", err);
                setGenderWarning(null);
            }
        } else {
            setGenderWarning(null);
        }
    };

    validateGender();
  }, [gender, userImage]);

  useEffect(() => {
    if (!garmentClassification) {
        setGarmentSwapWarning(null);
        return;
    }

    const { upperBody, lowerBody } = garmentClassification;
    let warning = null;

    if (swapUpperBody && !upperBody) {
        warning = "Warning: You've selected to swap the upper body, but the uploaded garment doesn't appear to be an upper body item.";
    } else if (swapLowerBody && !lowerBody) {
        warning = "Warning: You've selected to swap the lower body, but the uploaded garment doesn't appear to be a lower body item.";
    }

    setGarmentSwapWarning(warning);

  }, [swapUpperBody, swapLowerBody, garmentClassification]);

  useEffect(() => {
    const validateGarmentGender = async () => {
        if (gender && garmentImage) {
            try {
                // Pass the selected gender to the detection function for context
                const detectedGarmentGender = await detectGarmentGender(garmentImage, gender);
                if (detectedGarmentGender !== 'Unknown' && detectedGarmentGender !== gender) {
                    setGarmentGenderWarning(`Warning: You selected '${gender}' but the uploaded garment appears to be a ${detectedGarmentGender.toLowerCase()} garment. Please correct your selection or upload a new garment photo.`);
                } else {
                    setGarmentGenderWarning(null);
                }
            } catch (err) {
                console.error("Garment gender detection failed:", err);
                setGarmentGenderWarning(null); // Fail open, don't block user on API error
            }
        } else {
            setGarmentGenderWarning(null);
        }
    };

    validateGarmentGender();
  }, [gender, garmentImage]);

  const handleGarmentImageUpload = (file: ImageFile) => {
    // This is a new user action (or image removed), so clear previous analysis results
    setGarmentDescription('');
    setGarmentSuggestions([]);
    setGarmentClassification(null);
    setGarmentSwapWarning(null);
    setGarmentGenderWarning(null);
    // Now set the new image, which will trigger the analysis useEffect
    setGarmentImage(file);
  };

  const handleGenerate = async () => {
    if (!userImage || !garmentImage || !gender || !garmentDescription) {
      setError('Please complete all steps: select a gender, upload both photos, and confirm the garment description.');
      return;
    }
    if (!swapUpperBody && !swapLowerBody) {
      setError('Please select at least one garment part to swap.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setIsSaved(false);

    try {
      const resultBase64 = await generateVirtualTryOn(userImage, garmentImage, backgroundOption, swapUpperBody, swapLowerBody, gender, garmentDescription, aspectRatio);
      setGeneratedImage(`data:image/png;base64,${resultBase64}`);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Failed to generate the image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!generatedImage || isSaved) return;
    
    setError(null);
    
    try {
      onSave(generatedImage);
      setIsSaved(true);
    } catch (err) {
      console.error("Failed to dispatch save asset:", err);
      setError((err as Error).message || "Could not save the image. Please try again.");
      setIsSaved(false);
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `zola-ai-photoshoot-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleShare = async () => {
    if (!generatedImage) return;
    setError(null);
    const fileName = `zola-ai-photoshoot-${new Date().getTime()}.png`;
    const shareText = `Check out my new look from ZOLA AI!`;
    const file = await dataURLtoFile(generatedImage, fileName);

    if (!file) {
      setError("Could not prepare image for sharing.");
      return;
    }

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'My ZOLA AI Virtual Photoshoot',
          text: shareText,
          files: [file],
        });
      } catch (error) { console.log('Sharing cancelled or failed', error); }
    } else if (navigator.clipboard?.write) {
      try {
        const response = await fetch(generatedImage);
        const blob: Blob = await response.blob();
        const data: { [key: string]: Blob } = { [blob.type]: blob };
        await navigator.clipboard.write([new ClipboardItem(data)]);
        setShareFeedback('Copied!');
        setTimeout(() => setShareFeedback('Share'), 2000);
      } catch (error) {
        console.error('Failed to copy image to clipboard:', error);
        setError("Couldn't copy image. Try downloading it instead.");
      }
    } else {
      setError("Sharing is not supported on this browser. Please download the image.");
    }
  };

  const handleStartOver = async () => {
    setGender(null);
    setUserImage(null);
    setGarmentImage(null);
    setGarmentDescription('');
    setGarmentSuggestions([]);
    setBackgroundOption('studio');
    setAspectRatio('4:5');
    setGeneratedImage(null);
    setError(null);
    setIsRefining(false);
    setIsSaved(false);
    setShareFeedback('Share');
    setSwapUpperBody(false);
    setSwapLowerBody(false);
    setIsAnalyzingGarment(false);
    setGenderWarning(null);
    setGarmentSwapWarning(null);
    setGarmentGenderWarning(null);
    setGarmentClassification(null);
    
    // Clear any saved state from the session and IndexedDB.
    const GENERATED_IMAGE_KEY = `tryon-generated-image_${user.id}`;
    await deleteImage(USER_IMAGE_KEY);
    await deleteImage(GARMENT_IMAGE_KEY);
    await deleteImage(GENERATED_IMAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
  
  const handleApplyRefinement = (newImage: string) => {
    setGeneratedImage(newImage);
    setIsSaved(false); // New image is not saved yet
    setIsRefining(false);
  }

  const handleSendToAssetGenerator = () => {
    if (!generatedImage) return;
    sessionStorage.setItem('bridge_image_to_asset_generator', generatedImage);
    navigate(PATHS.ASSET_GENERATOR);
  };

  const isGeneratingDisabled = !userImage || !garmentImage || !gender || !garmentDescription || isLoading || (!swapUpperBody && !swapLowerBody) || !!genderWarning || !!garmentSwapWarning || !!garmentGenderWarning;
  
  const Section: React.FC<{title: string; number: number; children: React.ReactNode; isVisible: boolean}> = ({ title, number, children, isVisible }) => {
    if (!isVisible) return null;
    return (
      <div className="mt-8 pt-6 border-t border-gray-200/80 animate-fade-in">
        <h3 className="text-lg font-bold text-gray-800 mb-4"><span aria-hidden="true" className="text-white bg-[#9F1D35] rounded-full w-6 h-6 inline-flex items-center justify-center text-sm mr-3">{number}</span>{title}</h3>
        {children}
      </div>
    )
  };

  if (isStateLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Spinner />
        <p className="mt-4 text-gray-600">Loading your session...</p>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-gray-200/50">
        <div className="text-center mb-2">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#2E1E1E] font-headline">Virtual Photoshoot & Seamless Swap</h1>
        </div>
        
        {/* --- PREPARATION VIEW --- */}
        {!generatedImage && !isLoading && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#9F1D35]/5 border-l-4 border-[#9F1D35]/50 p-4 rounded-r-lg mb-8">
                <h3 className="font-bold text-[#9F1D35]">Instructions for a Perfect Fit:</h3>
                <p className="text-[#2E1E1E]/80 text-sm mt-1">
                    For best results, provide the AI with context. Select a gender, then upload clear photos for the person and the garment.
                </p>
            </div>

            {/* Step 1: Gender */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4"><span aria-hidden="true" className="text-white bg-[#9F1D35] rounded-full w-6 h-6 inline-flex items-center justify-center text-sm mr-3">1</span>Select Subject's Gender</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setGender('Male')} aria-pressed={gender === 'Male'} className={`flex flex-col items-center p-6 border-2 rounded-2xl transition-colors ${gender === 'Male' ? 'border-[#9F1D35] bg-[#9F1D35]/5 ring-2 ring-[#9F1D35]/30' : 'border-gray-300 hover:border-gray-400'}`}>
                  <span className="w-10 h-10 mb-2 text-[#9F1D35]"><MaleIcon/></span>
                  <span className="font-semibold text-gray-800">Male</span>
                </button>
                <button onClick={() => setGender('Female')} aria-pressed={gender === 'Female'} className={`flex flex-col items-center p-6 border-2 rounded-2xl transition-colors ${gender === 'Female' ? 'border-[#9F1D35] bg-[#9F1D35]/5 ring-2 ring-[#9F1D35]/30' : 'border-gray-300 hover:border-gray-400'}`}>
                  <span className="w-10 h-10 mb-2 text-[#9F1D35]"><FemaleIcon/></span>
                  <span className="font-semibold text-gray-800">Female</span>
                </button>
              </div>
              {genderWarning && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm rounded-lg animate-fade-in" role="alert">
                    {genderWarning}
                </div>
              )}
            </div>

            <Section title="Upload Images" number={2} isVisible={gender !== null}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ImageUploader id="user-image" title="Upload Target Person" onImageUpload={setUserImage} icon={<UserIcon />} currentFile={userImage}/>
                <ImageUploader id="garment-image" title="Upload Source Garment" onImageUpload={handleGarmentImageUpload} icon={<GarmentIcon />} currentFile={garmentImage}/>
              </div>
            </Section>
            
            <Section title="Confirm Garment Type" number={3} isVisible={garmentImage !== null}>
              {isAnalyzingGarment ? (
                <div className="flex items-center text-gray-500">
                  <Spinner /> <span className="ml-3">Analyzing garment...</span>
                </div>
              ) : (
                <div>
                  <label htmlFor="garment-desc" className="block text-sm font-medium text-gray-700 mb-1">AI Generated Description (Editable)</label>
                  <input
                    id="garment-desc"
                    type="text"
                    value={garmentDescription}
                    onChange={(e) => setGarmentDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9F1D35] focus:border-transparent transition"
                    placeholder="e.g., a women's blue Anarkali style Kurti"
                  />
                  {garmentSuggestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">AI Suggestions (click to add):</p>
                      <div className="flex flex-wrap gap-2">
                        {garmentSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                                if (!garmentDescription.toLowerCase().includes(suggestion.toLowerCase())) {
                                    setGarmentDescription(prev => `${prev}, ${suggestion}`);
                                }
                            }}
                            title={`Add "${suggestion}"`}
                            className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium hover:bg-[#9F1D35]/10 hover:text-[#9F1D35] transition-colors"
                          >
                            + {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">A more accurate description leads to a better result.</p>
                </div>
              )}
            </Section>
            
            <Section title="Choose What to Swap" number={4} isVisible={garmentDescription !== ''}>
              <div className="flex flex-col md:flex-row md:space-x-6 space-y-3 md:space-y-0">
                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100">
                  <input type="checkbox" checked={swapUpperBody} onChange={(e) => setSwapUpperBody(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-[#9F1D35] focus:ring-[#9F1D35]" />
                  <span className="text-gray-700 font-medium">Swap Upper Body Garment (Top/Shirt/Jacket)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100">
                  <input type="checkbox" checked={swapLowerBody} onChange={(e) => setSwapLowerBody(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-[#9F1D35] focus:ring-[#9F1D35]" />
                  <span className="text-gray-700 font-medium">Swap Lower Body Garment (Pant/Skirt/Shorts)</span>
                </label>
              </div>
              {garmentGenderWarning && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm rounded-lg animate-fade-in" role="alert">
                    {garmentGenderWarning}
                </div>
              )}
              {garmentSwapWarning && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm rounded-lg animate-fade-in" role="alert">
                    {garmentSwapWarning}
                </div>
              )}
            </Section>
            
            <Section title="Final Touches & Generation" number={5} isVisible={garmentDescription !== ''}>
              <div className="flex flex-col items-center justify-center space-y-6">
                
                <div>
                  <label className="block text-center text-sm font-medium text-gray-700 mb-2">Background Style</label>
                  <div className="inline-flex rounded-full bg-gray-100 p-1 border border-gray-200/80 flex-wrap justify-center">
                    {(
                      [
                        ['studio', 'Studio'],
                        ['white', 'Plain White'],
                        ['outdoor', 'Outdoor'],
                        ['original', 'Original'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setBackgroundOption(value)}
                        className={`px-4 sm:px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ease-out m-0.5 ${backgroundOption === value ? 'bg-white text-[#9F1D35] shadow-sm' : 'bg-transparent text-gray-600 hover:bg-gray-200/50'}`}
                        aria-pressed={backgroundOption === value}
                        title={label}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                    <label className="block text-center text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                    <div className="inline-flex rounded-full bg-gray-100 p-1 border border-gray-200/80">
                        {( [['1:1', 'Square'], ['4:5', 'Portrait'], ['16:9', 'Landscape']] as const).map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setAspectRatio(value)}
                                className={`px-4 sm:px-6 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ease-out ${aspectRatio === value ? 'bg-white text-[#9F1D35] shadow-sm' : 'bg-transparent text-gray-600 hover:bg-gray-200/50'}`}
                                aria-pressed={aspectRatio === value}
                                title={label}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                </div>
                
                <button onClick={handleGenerate} disabled={isGeneratingDisabled} className="px-12 py-4 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9F1D35] transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none">
                  Generate Photoshoot
                </button>
                {error && (<div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center"><p>{error}</p></div>)}
              </div>
            </Section>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-16">
            <div className="flex justify-center items-center"><Spinner /></div>
            <p className="mt-4 text-lg text-gray-600 animate-pulse">Generating your photoshoot...</p>
            <p className="text-sm text-gray-500 mt-1">Target speed: 10-15 seconds.</p>
          </div>
        )}
        
        {/* --- RESULT VIEW --- */}
        {generatedImage && !isLoading && (
          <div className="mt-2 animate-fade-in">
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Your New Look</h2>
            <div className="w-full flex justify-center">
              <div className="relative bg-gray-100 rounded-2xl shadow-lg overflow-hidden border-2 border-gray-200 p-2 max-w-lg w-full">
                <img src={generatedImage} alt="AI Generated Photoshoot Result" className="rounded-xl w-full object-contain" />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              <button onClick={() => setIsRefining(true)} className="flex items-center justify-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-full shadow-md hover:bg-gray-800 transition-colors">
                <RefineIcon /> Refine
              </button>
              <button onClick={handleSendToAssetGenerator} className="flex items-center justify-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-full shadow-md hover:bg-gray-800 transition-colors">
                <div className="w-5 h-5 mr-2"><AssetGeneratorIcon /></div> Send to Asset Generator
              </button>
              <button onClick={handleDownload} className="flex items-center justify-center px-6 py-3 bg-white text-gray-700 border border-gray-300 font-semibold rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                <DownloadIcon /> Download
              </button>
              <button onClick={handleShare} className="flex items-center justify-center px-6 py-3 bg-white text-gray-700 border border-gray-300 font-semibold rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                <ShareIcon className="h-5 w-5 mr-2" /> {shareFeedback}
              </button>
              <button onClick={handleSave} disabled={isSaved} className="flex items-center justify-center px-6 py-3 bg-white text-[#9F1D35] border border-[#9F1D35] font-semibold rounded-full shadow-sm hover:bg-[#9F1D35]/5 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed min-w-[180px]">
                {isSaved ? '✓ Saved!' : <><SaveIcon /> Save to Gallery</>}
              </button>
            </div>
            {error && (<div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center text-sm"><p>{error}</p></div>)}
            <div className="text-center mt-8 pt-6 border-gray-200">
              <button onClick={handleStartOver} className="text-[#9F1D35] hover:text-[#80172a] font-semibold">
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center mt-8 text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} ZOLA AI. All rights reserved.</p>
      </footer>
    </div>
    
    {isRefining && generatedImage && userImage && garmentImage && gender && garmentDescription && (
      <RefinementModal
        userImage={userImage}
        garmentImage={garmentImage}
        initialGeneratedImage={generatedImage}
        onApply={handleApplyRefinement}
        onClose={() => setIsRefining(false)}
        gender={gender}
        garmentDescription={garmentDescription}
      />
    )}
    </>
  );
};

export default TryOnPage;