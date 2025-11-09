import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ImageFile } from '../types';
import { generatePoseSwapImage } from '../services/styleSceneService';
import { saveImage, getImage, deleteImage } from '../services/imageStore';
import { uploadStyleSceneImage, deleteUserStyleSceneFolder } from '../services/db';
import { ALL_MODELS, Model, Pose } from '../services/models';
import ImageUploader from '../components/ImageUploader';
import { GarmentIcon, DownloadIcon, FixItIcon, ChangeBackgroundIcon } from '../components/icons';
import Spinner from '../components/Spinner';
import FixItModal from '../components/FixItModal';
import CollectionModal, { CollectionItem } from '../components/CollectionModal';
import { PATHS } from '../constants/paths';

// Add a declaration for the JSZip library loaded from CDN
declare var JSZip: any;

interface StyleScenePageProps {
  user: User;
}

// --- Data Definitions for Selections ---
const GENDERS = [{ id: 'Male', name: 'Male' }, { id: 'Female', name: 'Female' }];

export interface GeneratedImageResult {
  imageUrl: string;
  poseName: string;
  poseId: string;
  sourceView: 'front' | 'back';
}

type PoseGenerationStatus = 'idle' | 'loading' | 'success' | 'error';
interface PoseGenerationState {
    status: PoseGenerationStatus;
    resultUrl?: string; // This will now be a Supabase public URL
    sourceView?: 'front' | 'back';
}

const urlToImageFile = async (url: string): Promise<ImageFile> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                if (!dataUrl) {
                    return reject(new Error("FileReader failed to produce a data URL."));
                }
                const base64 = dataUrl.split(',')[1];
                resolve({
                    dataUrl,
                    base64,
                    mimeType: blob.type,
                });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Failed to convert URL to ImageFile", error);
        throw new Error("Could not load model or pose image from URL.");
    }
};

type PoseForDisplay = Pose | { id: string; name: string; imageUrl: string; command: string; };

const StyleScenePage: React.FC<StyleScenePageProps> = ({ user }) => {
  // Main state
  const [garmentFrontImage, setGarmentFrontImage] = useState<ImageFile>(null);
  const [garmentBackImage, setGarmentBackImage] = useState<ImageFile>(null);
  const [gender, setGender] = useState<'Male' | 'Female' | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [poseGenerationState, setPoseGenerationState] = useState<Record<string, PoseGenerationState>>({});
  const [error, setError] = useState<string | null>(null);
  const [poseCollections, setPoseCollections] = useState<Record<string, CollectionItem[]>>({});
  
  const prevModelIdRef = useRef<string | null>(null);
  const [isStateLoading, setIsStateLoading] = useState(true);

  // View & Modal control state
  const [currentView, setCurrentView] = useState<'setup' | 'generate'>('setup');
  const [generationTarget, setGenerationTarget] = useState<{ pose: PoseForDisplay; garmentView: 'front' | 'back' } | null>(null);
  const [poseToGenerate, setPoseToGenerate] = useState<PoseForDisplay | null>(null); // For the front/back selection modal
  const [fixingImageInfo, setFixingImageInfo] = useState<GeneratedImageResult | null>(null);
  const [viewingCollection, setViewingCollection] = useState<{ poseName: string; images: CollectionItem[] } | null>(null);

  const navigate = useNavigate();

  // User-specific storage keys
  const SESSION_STORAGE_KEY = `styleSceneState_${user.id}`;
  const GARMENT_FRONT_IMAGE_KEY = `stylescene-garment-front-image_${user.id}`;
  const GARMENT_BACK_IMAGE_KEY = `stylescene-garment-back-image_${user.id}`;

  // Load state on mount
  useEffect(() => {
    const loadState = async () => {
        // --- 1. Load general session state into local variables first ---
        let loadedPoseState: Record<string, PoseGenerationState> = {};
        let loadedCollections: Record<string, CollectionItem[]> = {};
        
        try {
            const savedStateJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                if (savedState.garmentFrontImageKey) setGarmentFrontImage(await getImage(savedState.garmentFrontImageKey));
                if (savedState.garmentBackImageKey) setGarmentBackImage(await getImage(savedState.garmentBackImageKey));
                if (savedState.gender) setGender(savedState.gender);
                if (savedState.modelId) setModelId(savedState.modelId);
                
                if (savedState.poseGenerationState) loadedPoseState = savedState.poseGenerationState;
                if (savedState.poseCollections) loadedCollections = savedState.poseCollections;
            }
        } catch (error) {
            console.error("Failed to load state from session storage", error);
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }

        // --- 2. Check for updates from Background Gallery and merge ---
        const poseId = sessionStorage.getItem('updated_image_pose_id');
        if (poseId) {
            const collectionJSON = sessionStorage.getItem('updated_image_collection');
            if (collectionJSON) {
                try {
                    const updatedCollection = JSON.parse(collectionJSON);
                    loadedCollections = { ...loadedCollections, [poseId]: updatedCollection };
                } catch (e) { console.error("Failed to parse updated collection", e); }
            }

            const newImageUrl = sessionStorage.getItem('updated_image_url');
            if (newImageUrl && newImageUrl !== 'null') {
                const oldStateForPose = loadedPoseState[poseId] || {};
                loadedPoseState = {
                    ...loadedPoseState,
                    [poseId]: {
                        ...oldStateForPose, // This is the crucial part that preserves sourceView
                        status: 'success',
                        resultUrl: newImageUrl,
                    }
                };
            }

            // --- 3. Clean up session storage keys ---
            sessionStorage.removeItem('updated_image_pose_id');
            sessionStorage.removeItem('updated_image_collection');
            sessionStorage.removeItem('updated_image_url');
        }
        
        // --- 4. Set the final, merged state once ---
        setPoseCollections(loadedCollections);
        setPoseGenerationState(loadedPoseState);
        
        // --- 5. Signal that loading is complete ---
        setIsStateLoading(false);
    };

    const selectedModelId = sessionStorage.getItem('selected_model_id');
    if (selectedModelId) {
        setModelId(selectedModelId);
        const model = ALL_MODELS.find(m => m.id === selectedModelId);
        if (model) setGender(model.gender);
        sessionStorage.removeItem('selected_model_id');
    }

    loadState();
  }, [user.id, SESSION_STORAGE_KEY]);

  // Save state on change
  useEffect(() => {
    // Fix: Prevent saving state until the initial load is complete.
    if (isStateLoading) {
        return;
    }

    const saveState = async () => {
        try {
            // Garment images are still temporarily stored in IndexedDB
            if (garmentFrontImage) await saveImage(GARMENT_FRONT_IMAGE_KEY, garmentFrontImage);
            else await deleteImage(GARMENT_FRONT_IMAGE_KEY);
            if (garmentBackImage) await saveImage(GARMENT_BACK_IMAGE_KEY, garmentBackImage);
            else await deleteImage(GARMENT_BACK_IMAGE_KEY);

            const stateToSave = {
                garmentFrontImageKey: garmentFrontImage ? GARMENT_FRONT_IMAGE_KEY : null,
                garmentBackImageKey: garmentBackImage ? GARMENT_BACK_IMAGE_KEY : null,
                gender,
                modelId,
                poseGenerationState, // Public URLs are fine to store
                poseCollections,
            };
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save state", error);
        }
    };
    saveState();
  }, [isStateLoading, garmentFrontImage, garmentBackImage, gender, modelId, poseGenerationState, poseCollections, user.id, SESSION_STORAGE_KEY, GARMENT_FRONT_IMAGE_KEY, GARMENT_BACK_IMAGE_KEY]);

  const selectedModel = useMemo(() => modelId ? ALL_MODELS.find(m => m.id === modelId) : null, [modelId]);
  
  const finalImages: GeneratedImageResult[] = useMemo(() => {
    if (!selectedModel) return [];
    const entries: [string, PoseGenerationState][] = Object.entries(poseGenerationState);
    return entries
        .filter(([, state]) => state.status === 'success' && state.resultUrl && state.sourceView)
        .map(([poseId, state]) => {
            const pose = selectedModel.poses.find(p => p.id === poseId);
            return {
                imageUrl: state.resultUrl!,
                poseName: pose?.name || 'Generated Pose',
                poseId: poseId,
                sourceView: state.sourceView!,
            };
        });
  }, [poseGenerationState, selectedModel]);

  useEffect(() => {
    // This effect clears generated poses and collections ONLY when the model is
    // changed from one selection to another, not on initial load.
    // It compares the current modelId with the previous one stored in a ref.
    if (prevModelIdRef.current && modelId && prevModelIdRef.current !== modelId) {
      setPoseGenerationState({});
      setPoseCollections({});
    }
    // Update the ref to the current modelId for the next render.
    prevModelIdRef.current = modelId;
  }, [modelId]);
  
  const handleGarmentFrontUpload = async (file: ImageFile) => {
    await deleteUserStyleSceneFolder(user.id);
    await deleteImage(GARMENT_BACK_IMAGE_KEY);
    
    setGarmentFrontImage(file);
    setGarmentBackImage(null);
    setPoseGenerationState({});
    setPoseCollections({});
  };

  const handleStartGeneration = (pose: PoseForDisplay, garmentView: 'front' | 'back') => {
    setGenerationTarget({ pose, garmentView });
    setCurrentView('generate');
    setPoseToGenerate(null);
  };
  
  const handleChangeBackground = (result: GeneratedImageResult) => {
    sessionStorage.setItem('image_for_background_change', result.imageUrl);
    sessionStorage.setItem('poseId_for_background_change', result.poseId);
    sessionStorage.setItem('stylescene_user_id', user.id);
    
    // Get the current collection for this pose
    const currentCollection = poseCollections[result.poseId] || [];

    // Create the original item for the collection
    const originalItem: CollectionItem = {
      id: 'original', // Use a special identifier
      imageUrl: result.imageUrl,
    };
    
    // Check if the original image is already in the collection to avoid duplicates
    const isOriginalPresent = currentCollection.some(item => item.id === 'original');

    let collectionToPass = currentCollection;

    if (!isOriginalPresent) {
      // Add the original image to the beginning of the collection if it's not there
      collectionToPass = [originalItem, ...currentCollection];
    }
    
    sessionStorage.setItem('existing_collection_for_pose', JSON.stringify(collectionToPass));
    navigate(PATHS.BACKGROUND_GALLERY);
  };

  const handleGenerate = async () => {
    if (!generationTarget || !selectedModel) return;

    const { pose, garmentView } = generationTarget;
    const garmentImage = garmentView === 'front' ? garmentFrontImage : garmentBackImage;

    if (!garmentImage) {
        setError(`Garment image for the ${garmentView} view is missing.`);
        return;
    }
    
    setPoseGenerationState(prev => ({ ...prev, [pose.id]: { status: 'loading' } }));
    setCurrentView('setup'); // Navigate back to the main view immediately
    setError(null);
    
    try {
        const modelImageFile = await urlToImageFile(selectedModel.closeUpUrl);
        const poseReferenceImageFile = await urlToImageFile(pose.imageUrl);
      
        const resultBase64 = await generatePoseSwapImage(
            garmentImage,
            modelImageFile,
            poseReferenceImageFile,
            pose.command // Pass the specific pose command
        );
        const imageUrl = await uploadStyleSceneImage(user.id, pose.id, resultBase64);
      
        setPoseGenerationState(prev => ({
            ...prev,
            [pose.id]: { status: 'success', resultUrl: imageUrl, sourceView: garmentView }
        }));
    } catch (err) {
        console.error(err);
        setError((err as Error).message || `Failed to generate pose ${pose.name}.`);
        setPoseGenerationState(prev => ({ ...prev, [pose.id]: { status: 'error' } }));
    } finally {
        setGenerationTarget(null);
    }
  };

  const handleRegenerate = async (poseId: string, fixInstruction: string) => {
    if (!fixingImageInfo) return;

    const sourceView = fixingImageInfo.sourceView;
    const garmentImage = sourceView === 'front' ? garmentFrontImage : garmentBackImage;
    if (!garmentImage || !selectedModel) {
        setError("Cannot regenerate. Key information (garment or model) is missing.");
        setFixingImageInfo(null);
        return;
    }
    
    setPoseGenerationState(prev => ({ ...prev, [poseId]: { status: 'loading' } }));
    setError(null);

    try {
        const pose = selectedModel.poses.find(p => p.id === poseId);
        if (!pose) throw new Error("Pose for regeneration not found.");
      
        const [modelImageFile, poseReferenceImageFile] = await Promise.all([
            urlToImageFile(selectedModel.closeUpUrl),
            urlToImageFile(pose.imageUrl),
        ]);
        
        const resultBase64 = await generatePoseSwapImage(
            garmentImage,
            modelImageFile,
            poseReferenceImageFile,
            pose.command, // Pass the original command
            fixInstruction // Pass the new fix instruction
        );
        const imageUrl = await uploadStyleSceneImage(user.id, pose.id, resultBase64);
        
        setPoseGenerationState(prev => ({
            ...prev,
            [poseId]: { status: 'success', resultUrl: imageUrl, sourceView: sourceView }
        }));
    } catch (err) {
      console.error(err);
      setError((err as Error).message || `Failed to regenerate pose ${poseId}.`);
      setPoseGenerationState(prev => ({ ...prev, [poseId]: { ...prev[poseId], status: 'error' } }));
    } finally {
        setFixingImageInfo(null);
    }
  };
  
  const handleStartOver = async () => {
    await deleteUserStyleSceneFolder(user.id);
    
    setGarmentFrontImage(null);
    setGarmentBackImage(null);
    setGender(null);
    setModelId(null);
    setPoseGenerationState({});
    setPoseCollections({});
    setError(null);
    setCurrentView('setup');
    setGenerationTarget(null);
    await deleteImage(GARMENT_FRONT_IMAGE_KEY);
    await deleteImage(GARMENT_BACK_IMAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };
  
  const handleDownloadAll = async () => {
    if (finalImages.length === 0) return;
    try {
      const zip = new JSZip();
      for (let i = 0; i < finalImages.length; i++) {
        const response = await fetch(finalImages[i].imageUrl);
        const blob = await response.blob();
        zip.file(`campaign-image-${i + 1}.png`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `zola-ai-campaign-${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error creating ZIP file:", error);
      setError("Could not create ZIP file for download.");
    }
  };

  const handleDownloadSingle = async (imageUrl: string, poseName: string) => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${poseName.replace(/\s+/g, '_')}-campaign-image.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download failed:", error);
        setError("Could not download the image. Please try again.");
    }
  };

  const renderStep = (title: string, stepNumber: number, isVisible: boolean, children: React.ReactNode) => {
    if (!isVisible) return null;
    return (
      <div className="mt-8 pt-6 border-t border-gray-200/80 animate-fade-in">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          <span aria-hidden="true" className="text-white bg-[#9F1D35] rounded-full w-8 h-8 inline-flex items-center justify-center text-sm font-headline">{stepNumber}</span>
          {title}
        </h3>
        {children}
      </div>
    );
  };

  if (currentView === 'generate' && generationTarget) {
    const garmentImageToGenerate = generationTarget.garmentView === 'front' ? garmentFrontImage : garmentBackImage;
    return (
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 animate-fade-in">
            <main className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-gray-200/50">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#2E1E1E] font-headline">Confirm Generation</h1>
                    <p className="text-gray-600 mt-2">The AI will now swap the garment onto the model in the selected pose.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="text-center">
                        <h3 className="font-semibold text-gray-700 mb-2">Selected Pose</h3>
                        <img src={generationTarget.pose.imageUrl} alt="Selected pose" className="rounded-xl shadow-md border" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-gray-700 mb-2">Selected Garment ({generationTarget.garmentView} view)</h3>
                        <img src={garmentImageToGenerate?.dataUrl} alt="Selected garment" className="rounded-xl shadow-md border" />
                    </div>
                </div>
                <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col items-center gap-4">
                    <button
                        onClick={handleGenerate}
                        className="px-12 py-4 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-all duration-300"
                    >
                        Generate Image
                    </button>
                    <button onClick={() => setCurrentView('setup')} className="text-sm text-gray-500 hover:text-gray-800">
                        &larr; Back to Pose Selection
                    </button>
                </div>
            </main>
        </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <main className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-gray-200/50">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#2E1E1E] font-headline">Style|Scene Campaign Director</h1>
            <p className="text-gray-600 mt-2 text-lg">Your AI-Powered E-commerce Photoshoot</p>
          </div>

          <div className="max-w-4xl mx-auto">
            {renderStep("Upload Garment (Front & Back)", 1, true, (
              <>
                <div className="bg-[#9F1D35]/5 border-l-4 border-[#9F1D35]/50 p-4 rounded-r-lg mb-6">
                    <h3 className="font-bold text-[#9F1D35]">Input Pre-requisites for Best Results:</h3>
                    <ul className="list-disc list-inside text-[#2E1E1E]/80 text-sm mt-2 space-y-1">
                        <li><b>Garment Isolation (CRITICAL):</b> Uploaded garments MUST be clean, clearly visible, and fully isolated (preferably from a Ghost Mannequin or Flat-Lay shot).</li>
                         <li><b>Provide Both Views:</b> For the highest accuracy, upload both the front and back views of your garment.</li>
                    </ul>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <ImageUploader id="garment-front-image" title="Upload Garment (Front View)" onImageUpload={handleGarmentFrontUpload} icon={<GarmentIcon />} currentFile={garmentFrontImage} />
                    <ImageUploader id="garment-back-image" title="Upload Garment (Back View)" onImageUpload={setGarmentBackImage} icon={<GarmentIcon />} currentFile={garmentBackImage} />
                </div>
              </>
            ))}
            
            {renderStep("Define Model", 2, !!garmentFrontImage && !!garmentBackImage, (
                <div className="bg-gray-50 p-4 rounded-xl border">
                    {selectedModel ? (
                        <div className="flex gap-4 items-center">
                            <img src={selectedModel.fullBodyUrl} alt={selectedModel.label} className="w-24 h-32 object-cover rounded-md shadow-sm" />
                            <div>
                                <h4 className="font-bold text-gray-800">Selected Model</h4>
                                <p className="text-sm text-gray-600">{selectedModel.label} ({selectedModel.gender})</p>
                                <button onClick={() => { setModelId(null); setGender(null); }} className="mt-2 text-xs text-[#9F1D35] font-semibold hover:underline">Change Model</button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Model Gender</label>
                            <div className="flex gap-2 mb-4">
                                {GENDERS.map(g => <button key={g.id} onClick={() => setGender(g.id as any)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${gender === g.id ? 'bg-[#9F1D35]/10 border-[#9F1D35]' : 'bg-white border-gray-300 hover:border-gray-400'}`}>{g.name}</button>)}
                            </div>
                            <button
                                onClick={() => {
                                    sessionStorage.setItem('model_gallery_gender', gender!);
                                    navigate(PATHS.MODEL_GALLERY);
                                }}
                                disabled={!gender}
                                className="w-full py-2.5 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-full shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Browse Models
                            </button>
                        </div>
                    )}
                </div>
            ))}
            
            {renderStep("Generate Poses", 3, !!modelId, (
                <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {(selectedModel?.poses || []).map((pose, index) => {
                            const state = poseGenerationState[pose.id] || { status: 'idle' };
                            const isDisabled = state.status === 'loading';
                            let buttonText = 'Start';
                            if (state.status === 'loading') buttonText = 'Generating...';
                            if (state.status === 'success') buttonText = '✓ Generated';
                            if (state.status === 'error') buttonText = 'Retry';
                            return (
                                <div key={pose.id} className="flex flex-col">
                                    <div className="relative group">
                                      <img src={pose.imageUrl} alt={`Pose ${index + 1}`} className="w-full aspect-[4/5] object-cover rounded-lg border border-gray-200" />
                                      {state.status === 'success' && state.resultUrl && (
                                        <img src={state.resultUrl} alt={`Generated ${pose.name}`} className="w-full aspect-[4/5] object-cover rounded-lg absolute inset-0" />
                                      )}
                                      {state.status === 'loading' && (
                                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg"><Spinner/></div>
                                      )}
                                    </div>
                                    <p className="text-xs font-semibold text-gray-700 block truncate text-center mt-2 h-7 flex items-center justify-center" title={pose.name}>{pose.name}</p>
                                    <button
                                        onClick={() => state.status !== 'success' && setPoseToGenerate(pose)}
                                        disabled={isDisabled}
                                        className={`mt-1 w-full text-xs font-semibold py-1.5 rounded-full transition-colors flex items-center justify-center h-7 ${
                                            state.status === 'success' ? 'bg-green-100 text-green-800 cursor-default' : 
                                            state.status === 'error' ? 'bg-red-500 text-white' :
                                            'bg-[#9F1D35] text-white hover:bg-[#80172a] disabled:bg-gray-400 disabled:cursor-not-allowed'
                                        }`}
                                    >
                                        {buttonText}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {renderStep("Final Image Gallery", 4, finalImages.length > 0, (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-600">{finalImages.length} image{finalImages.length !== 1 && 's'} generated.</p>
                    <button onClick={handleDownloadAll} className="flex items-center justify-center px-4 py-2 bg-[#2E1E1E] text-white text-sm font-semibold rounded-full shadow-md hover:bg-black transition-colors">
                        <div className="h-5 w-5 mr-2"><DownloadIcon className="w-full h-full" /></div> Download All (.zip)
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {finalImages.map((result, index) => {
                    const collection = poseCollections[result.poseId] || [];
                    return (
                        <div key={`${result.poseId}-${index}`} className="flex flex-col">
                            <div className="relative group aspect-[4/5] bg-gray-100 rounded-xl shadow-lg overflow-hidden border border-gray-200">
                                <img src={result.imageUrl} alt={`Generated image ${index + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-2">
                                    <button
                                        onClick={() => handleChangeBackground(result)}
                                        className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-full transition-colors bg-white/90 text-gray-800 hover:bg-white"
                                        title="Change Background"
                                    >
                                        <div className="w-4 h-4"><ChangeBackgroundIcon /></div>
                                        Change Background
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setFixingImageInfo(result)}
                                            className="flex-1 bg-white/90 text-gray-800 p-2 rounded-full hover:bg-white"
                                            title="Fix This Image"
                                        >
                                            <div className="w-4 h-4 mx-auto"><FixItIcon /></div>
                                        </button>
                                        <button
                                            onClick={() => handleDownloadSingle(result.imageUrl, result.poseName)}
                                            className="flex-1 bg-white/90 text-gray-800 p-2 rounded-full hover:bg-white"
                                            title="Download Image"
                                        >
                                            <div className="w-4 h-4 mx-auto"><DownloadIcon className="w-full h-full" /></div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-gray-700 text-center truncate">{result.poseName}</p>
                            {collection.length > 0 && (
                                <button
                                    onClick={() => setViewingCollection({ poseName: result.poseName, images: collection })}
                                    className="mt-2 w-full text-xs font-semibold py-1.5 px-2 rounded-full transition-colors flex items-center justify-center h-7 bg-gray-200 text-gray-800 hover:bg-gray-300 truncate"
                                    title={`Show Collection (${collection.length})`}
                                >
                                    Show Collection ({collection.length})
                                </button>
                            )}
                        </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {error && <p className="mt-6 text-red-600 text-center bg-red-50 p-3 rounded-lg border border-red-300">{error}</p>}

            <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col items-center">
              <button onClick={handleStartOver} className="text-[#9F1D35] hover:text-[#80172a] font-semibold">
                Start Over With a New Garment
              </button>
            </div>
          </div>
        </main>

        <footer className="text-center mt-8 text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} ZOLA AI. All rights reserved.</p>
        </footer>
      </div>

      {poseToGenerate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setPoseToGenerate(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 font-headline">Select Garment View</h2>
            <p className="mt-2 text-gray-600">Which side of the garment should be visible in this pose?</p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleStartGeneration(poseToGenerate, 'front')}
                disabled={!garmentFrontImage}
                className="w-full px-6 py-3 bg-[#9F1D35] text-white font-semibold rounded-lg shadow-md hover:bg-[#80172a] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Use Front View
              </button>
              <button
                onClick={() => handleStartGeneration(poseToGenerate, 'back')}
                disabled={!garmentBackImage}
                className="w-full px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-black transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Use Back View
              </button>
            </div>
            <button onClick={() => setPoseToGenerate(null)} className="mt-4 text-sm text-gray-500 hover:text-gray-800">Cancel</button>
          </div>
        </div>
      )}

      {fixingImageInfo && (
        <FixItModal
            imageInfo={fixingImageInfo}
            onClose={() => setFixingImageInfo(null)}
            onRegenerate={handleRegenerate}
        />
      )}

      {viewingCollection && (
        <CollectionModal
          images={viewingCollection.images}
          poseName={viewingCollection.poseName}
          onClose={() => setViewingCollection(null)}
        />
      )}
    </>
  );
};

export default StyleScenePage;
