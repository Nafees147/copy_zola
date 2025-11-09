import React, { useState, useEffect, useRef } from 'react';
import { User, ImageFile } from '../types';
import { generatePerfectedMannequin } from '../services/catalogService';
import { 
    uploadCatalogSessionImage, 
    getSignedUrlsForCatalogSession, 
    deleteUserCatalogSessionFolder 
} from '../services/db';
import Spinner from '../components/Spinner';
import { DownloadIcon, SaveIcon, MaleIcon, FemaleIcon } from '../components/icons';
import ImageUploader from '../components/ImageUploader';
import { GarmentIcon } from '../components/icons';

declare var JSZip: any;

interface CatalogForgedPageProps {
  user: User;
  onSaveToCollection: (data: { imageUrl: string, asset_type: 'individual' | 'composed', item_name: string, item_category: string }) => void;
}

const BATCH_LIMIT = 20;
type View = 'setup' | 'upload' | 'processing' | 'results';
type GarmentType = 'upper' | 'lower' | 'full';

interface GarmentImage extends ImageFile {
  path?: string;
}

interface GeneratedResult {
  dataUrl: string;
  path?: string;
}

interface GarmentPair {
    id: string;
    front: GarmentImage | null;
    back: GarmentImage | null;
    status: 'pending' | 'processing' | 'success' | 'error';
    error: string | null;
    results: {
        frontMannequin: GeneratedResult | null;
        backMannequin: GeneratedResult | null;
    } | null;
}

const urlToImageFile = async (url: string): Promise<ImageFile | null> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const base64 = dataUrl.split(',')[1];
                resolve({ dataUrl, base64, mimeType: blob.type });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting URL to ImageFile:", error);
        return null;
    }
};

const CatalogForgedPage: React.FC<CatalogForgedPageProps> = ({ user, onSaveToCollection }) => {
    const [view, setView] = useState<View>('setup');
    const [gender, setGender] = useState<'Male' | 'Female' | null>(null);
    const [garmentType, setGarmentType] = useState<GarmentType | null>(null);
    const [garments, setGarments] = useState<GarmentPair[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
    
    const [isStateLoading, setIsStateLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const isInitialMount = useRef(true);
    
    const SESSION_STORAGE_KEY = `catalogForgedState_v6_mannequin_${user.id}`;

    // Load state on mount
    useEffect(() => {
        const loadState = async () => {
            setIsStateLoading(true);
            try {
                const savedStateJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
                if (savedStateJSON) {
                    const savedState = JSON.parse(savedStateJSON);
                    setView(savedState.view || 'setup');
                    setGender(savedState.gender || null);
                    setGarmentType(savedState.garmentType || null);
                    setSavedStatus(savedState.savedStatus || {});

                    if (savedState.garments && Array.isArray(savedState.garments)) {
                        const pathsToFetch: string[] = [];
                        savedState.garments.forEach((g: any) => {
                            if (g.frontPath) pathsToFetch.push(g.frontPath);
                            if (g.backPath) pathsToFetch.push(g.backPath);
                            if (g.results?.frontMannequinPath) pathsToFetch.push(g.results.frontMannequinPath);
                            if (g.results?.backMannequinPath) pathsToFetch.push(g.results.backMannequinPath);
                        });

                        const urlMap = await getSignedUrlsForCatalogSession(pathsToFetch);
                        
                        const loadedGarments = await Promise.all(savedState.garments.map(async (g: any): Promise<GarmentPair> => {
                            const [frontImg, backImg, frontMannequinImg, backMannequinImg] = await Promise.all([
                                g.frontPath ? urlToImageFile(urlMap.get(g.frontPath)!) : Promise.resolve(null),
                                g.backPath ? urlToImageFile(urlMap.get(g.backPath)!) : Promise.resolve(null),
                                g.results?.frontMannequinPath ? urlToImageFile(urlMap.get(g.results.frontMannequinPath)!) : Promise.resolve(null),
                                g.results?.backMannequinPath ? urlToImageFile(urlMap.get(g.results.backMannequinPath)!) : Promise.resolve(null)
                            ]);

                            return {
                                id: g.id,
                                status: g.status,
                                error: g.error,
                                front: g.frontPath && frontImg ? { ...frontImg, path: g.frontPath } : null,
                                back: g.backPath && backImg ? { ...backImg, path: g.backPath } : null,
                                results: g.results ? {
                                    frontMannequin: g.results.frontMannequinPath && frontMannequinImg ? { dataUrl: frontMannequinImg.dataUrl, path: g.results.frontMannequinPath } : null,
                                    backMannequin: g.results.backMannequinPath && backMannequinImg ? { dataUrl: backMannequinImg.dataUrl, path: g.results.backMannequinPath } : null,
                                } : null
                            };
                        }));
                        setGarments(loadedGarments);
                    }
                }
            } catch (err) {
                console.error("Failed to load state", err);
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
            } finally {
                setIsStateLoading(false);
            }
        };
        loadState();
    }, [user.id]);

    // Save state on change
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (isStateLoading || isProcessing) return;
        
        const serializableGarments = garments.map(g => ({
            id: g.id,
            status: g.status,
            error: g.error,
            frontPath: g.front?.path || null,
            backPath: g.back?.path || null,
            results: g.results ? {
                frontMannequinPath: g.results.frontMannequin?.path || null,
                backMannequinPath: g.results.backMannequin?.path || null,
            } : null
        }));
        
        const stateToSave = { view, gender, garmentType, garments: serializableGarments, savedStatus };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
    }, [view, gender, garmentType, garments, savedStatus, isStateLoading, isProcessing, user.id]);

    const handleProceedToUploads = (e: React.FormEvent) => {
        e.preventDefault();
        // Initialize with a single garment slot. More can be added on the next screen.
        setGarments([{
            id: `garment_${Date.now()}`, front: null, back: null, status: 'pending', error: null, results: null
        }]);
        setView('upload');
    };

    const handleAddGarment = () => {
        if (garments.length >= BATCH_LIMIT) return;
        const newGarment: GarmentPair = {
            id: `garment_${Date.now()}`,
            front: null,
            back: null,
            status: 'pending',
            error: null,
            results: null,
        };
        setGarments(prev => [...prev, newGarment]);
    };

    const handleRemoveGarment = (id: string) => {
        if (garments.length <= 1) return;
        // Orphaned files in storage will be cleaned up on the next "Start Over".
        setGarments(prev => prev.filter(g => g.id !== id));
    };


    const handleImageUpload = async (id: string, type: 'front' | 'back', file: ImageFile) => {
        if (!file) {
            setGarments(prev => prev.map(g => g.id === id ? { ...g, [type]: null } : g));
            return;
        }
        setGarments(prev => prev.map(g => g.id === id ? { ...g, [type]: file } : g));
        try {
            const path = await uploadCatalogSessionImage(user.id, id, type, file.base64);
            setGarments(prev => prev.map(g => g.id === id ? { ...g, [type]: { ...file, path } } : g));
        } catch (err) {
            console.error("Upload failed", err);
            setError(`Failed to upload ${type} image for ${id}.`);
            setGarments(prev => prev.map(g => g.id === id ? { ...g, [type]: null } : g));
        }
    };

    const handleProcessBatch = async () => {
        if (!gender || !garmentType) {
            setError("Gender and garment type must be selected.");
            return;
        }
        setIsProcessing(true);
        setView('processing');

        const updatedGarments = [...garments];
        for (let i = 0; i < updatedGarments.length; i++) {
            const garment = updatedGarments[i];
            setGarments(prev => prev.map(g => g.id === garment.id ? { ...g, status: 'processing' } : g));
            
            try {
                if (!garment.front || !garment.back) throw new Error("Both front and back images are required.");

                const [frontB64, backB64] = await Promise.all([
                    generatePerfectedMannequin(garment.front, 'front', gender, garmentType),
                    generatePerfectedMannequin(garment.back, 'back', gender, garmentType)
                ]);

                const [frontPath, backPath] = await Promise.all([
                    uploadCatalogSessionImage(user.id, garment.id, 'frontMannequin', frontB64),
                    uploadCatalogSessionImage(user.id, garment.id, 'backMannequin', backB64)
                ]);

                updatedGarments[i] = {
                    ...garment,
                    status: 'success',
                    results: {
                        frontMannequin: { dataUrl: `data:image/png;base64,${frontB64}`, path: frontPath },
                        backMannequin: { dataUrl: `data:image/png;base64,${backB64}`, path: backPath },
                    }
                };
            } catch (err) {
                console.error(`Failed to process ${garment.id}:`, err);
                updatedGarments[i] = { ...garment, status: 'error', error: (err as Error).message };
            } finally {
                 setGarments([...updatedGarments]);
            }
        }
        setView('results');
        setIsProcessing(false);
    };

    const handleSave = (garment: GarmentPair, view: 'front' | 'back') => {
        const result = view === 'front' ? garment.results?.frontMannequin : garment.results?.backMannequin;
        if (!result) return;
        const garmentNumber = garment.id.split('_')[1];
        onSaveToCollection({
          imageUrl: result.dataUrl,
          asset_type: 'individual',
          item_name: `Garment ${garmentNumber} - ${view === 'front' ? 'Front' : 'Back'} Mannequin`,
          item_category: 'Full Outfit',
        });
        setSavedStatus(prev => ({ ...prev, [`${garment.id}-${view}`]: true }));
    };

    const handleDownload = (imageUrl: string, filename: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStartOver = async () => {
        await deleteUserCatalogSessionFolder(user.id);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setView('setup');
        setGender(null);
        setGarmentType(null);
        setGarments([]);
        setIsProcessing(false);
        setError(null);
        setSavedStatus({});
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();
        garments.forEach(g => {
            if (g.status === 'success' && g.results) {
                const folder = zip.folder(g.id);
                if(folder) {
                    if (g.results.frontMannequin) folder.file('front_mannequin.png', g.results.frontMannequin.dataUrl.split(',')[1], { base64: true });
                    if (g.results.backMannequin) folder.file('back_mannequin.png', g.results.backMannequin.dataUrl.split(',')[1], { base64: true });
                }
            }
        });
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `zola-ai-catalog-${new Date().getTime()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isUploadComplete = garments.every(g => g.front && g.back);
    const successfulGarments = garments.filter(g => g.status === 'success');
  
    const MannequinCard: React.FC<{ garment: GarmentPair; view: 'front' | 'back'; result: GeneratedResult; }> = ({ garment, view, result }) => {
        const isSaved = savedStatus[`${garment.id}-${view}`];
        const garmentNumber = garment.id.split('_')[1];
        const filename = `Garment_${garmentNumber}_${view}_mannequin`;
        return (
          <div className="flex flex-col">
            <div className="relative group aspect-[4/5] bg-white rounded-lg shadow-sm overflow-hidden border">
              <img src={result.dataUrl} alt={`${garment.id} ${view} mannequin`} className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-2">
                  <button onClick={() => !isSaved && handleSave(garment, view)} disabled={isSaved} className="w-full flex items-center justify-center px-3 py-2 bg-white/90 text-sm text-[#9F1D35] border border-[#9F1D35] font-semibold rounded-full shadow-sm hover:bg-[#9F1D35]/5 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed">
                    <SaveIcon /> {isSaved ? '✓ Saved' : 'Save'}
                  </button>
                  <button onClick={() => handleDownload(result.dataUrl, filename)} className="w-full flex items-center justify-center px-3 py-2 bg-white/90 text-gray-700 text-sm font-semibold rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                    <DownloadIcon /> Download
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-600 text-center mt-2 capitalize">{view} Mannequin</p>
          </div>
        );
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
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <main className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-gray-200/50">
                <div className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-[#2E1E1E] font-headline">Catalog | Forged (Batch Mode)</h1>
                    <p className="text-gray-600 mt-2 text-lg">Generate perfected on-mannequin product shots.</p>
                </div>

                {view === 'setup' && (
                    <form onSubmit={handleProceedToUploads} className="max-w-lg mx-auto animate-fade-in text-left">
                        <div className="mb-8">
                            <label className="block text-lg font-bold text-gray-800 mb-4">Step 1: Select Gender</label>
                             <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => { setGender('Male'); setGarmentType(null); }} className={`flex flex-col items-center p-6 border-2 rounded-2xl transition-colors ${gender === 'Male' ? 'border-[#9F1D35] bg-[#9F1D35]/5' : 'border-gray-300 hover:border-gray-400'}`}>
                                    <span className="w-10 h-10 mb-2 text-[#9F1D35]"><MaleIcon/></span>
                                    <span className="font-semibold text-gray-800">Male</span>
                                </button>
                                <button type="button" onClick={() => { setGender('Female'); setGarmentType('full'); }} className={`flex flex-col items-center p-6 border-2 rounded-2xl transition-colors ${gender === 'Female' ? 'border-[#9F1D35] bg-[#9F1D35]/5' : 'border-gray-300 hover:border-gray-400'}`}>
                                    <span className="w-10 h-10 mb-2 text-[#9F1D35]"><FemaleIcon/></span>
                                    <span className="font-semibold text-gray-800">Female</span>
                                </button>
                            </div>
                        </div>

                        {gender === 'Male' && (
                            <div className="mb-8 animate-fade-in">
                                <label className="block text-lg font-bold text-gray-800 mb-4">Step 2: Select Garment Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={() => setGarmentType('upper')} className={`py-4 border-2 rounded-xl font-semibold transition-colors ${garmentType === 'upper' ? 'border-[#9F1D35] bg-[#9F1D35]/5' : 'border-gray-300 hover:border-gray-400'}`}>Upper Body</button>
                                    <button type="button" onClick={() => setGarmentType('lower')} className={`py-4 border-2 rounded-xl font-semibold transition-colors ${garmentType === 'lower' ? 'border-[#9F1D35] bg-[#9F1D35]/5' : 'border-gray-300 hover:border-gray-400'}`}>Lower Body</button>
                                </div>
                            </div>
                        )}
                        
                        <div className="mb-8">
                           <label className="block text-lg font-bold text-gray-800">
                                {gender === 'Female' ? 'Step 2' : 'Step 3'}: Proceed to Uploads
                            </label>
                            <p className="text-sm text-gray-500 mt-2">You will upload front and back photos for each garment. You can add or remove garments on the next screen (up to {BATCH_LIMIT} total).</p>
                        </div>
                        
                        <div className="text-center">
                            <button type="submit" disabled={!gender || !garmentType} className="mt-4 px-12 py-4 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">Proceed to Uploads</button>
                        </div>
                    </form>
                )}

                {view === 'upload' && (
                    <div className="animate-fade-in">
                        <div className="bg-[#9F1D35]/5 border-l-4 border-[#9F1D35]/50 p-4 rounded-r-lg mb-8">
                            <h3 className="font-bold text-[#9F1D35]">Input Pre-requisites for Best Results:</h3>
                            <ul className="list-disc list-inside text-[#2E1E1E]/80 text-sm mt-2 space-y-1">
                                <li><b>Clear Photos:</b> For best results, use flat-lay or on-hanger product photos with a clean background.</li>
                                <li><b>Provide Both Views:</b> Ensure you upload a front and back image for each garment to get a complete set.</li>
                            </ul>
                        </div>
                        <div className="space-y-8">
                            {garments.map((g, index) => (
                                <div key={g.id} className="p-6 bg-gray-50 rounded-2xl border relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-gray-800">Garment {index + 1}</h3>
                                        <button
                                            onClick={() => handleRemoveGarment(g.id)}
                                            disabled={garments.length <= 1}
                                            className="text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Remove Garment"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <ImageUploader id={`${g.id}-front`} title="Upload Front View" icon={<GarmentIcon/>} onImageUpload={(file) => handleImageUpload(g.id, 'front', file)} currentFile={g.front} />
                                        <ImageUploader id={`${g.id}-back`} title="Upload Back View" icon={<GarmentIcon/>} onImageUpload={(file) => handleImageUpload(g.id, 'back', file)} currentFile={g.back} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={handleAddGarment}
                                disabled={garments.length >= BATCH_LIMIT}
                                className="w-full sm:w-auto px-6 py-3 bg-white text-gray-700 border border-gray-300 font-semibold rounded-full shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                + Add Another Garment
                            </button>
                            <button onClick={handleProcessBatch} disabled={!isUploadComplete || isProcessing} className="w-full sm:w-auto px-12 py-4 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {isProcessing ? 'Processing...' : `Process ${garments.length} Garment(s)`}
                            </button>
                        </div>
                    </div>
                )}
                
                {(view === 'processing' || view === 'results') && (
                    <div className="animate-fade-in">
                        <div className="flex flex-wrap justify-center items-center gap-4 mb-8">
                            <button onClick={handleDownloadAll} disabled={isProcessing || successfulGarments.length === 0} className="flex items-center justify-center px-6 py-3 bg-[#2E1E1E] text-white font-semibold rounded-full shadow-md hover:bg-black transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                                <DownloadIcon /> Download All ({successfulGarments.length})
                            </button>
                            <button onClick={handleStartOver} disabled={isProcessing} className="px-6 py-3 bg-white text-gray-700 border border-gray-300 font-semibold rounded-full shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50">Start Over</button>
                        </div>
                        {error && <p className="mb-4 text-center text-red-600 bg-red-50 p-3 rounded-lg border border-red-300">{error}</p>}
                        <div className="space-y-8">
                            {garments.map(g => (
                                <div key={g.id} className="p-6 rounded-2xl border transition-all" style={{ background: g.status === 'success' ? '#F0FFF4' : g.status === 'error' ? '#FFF5F5' : '#F7FAFC' }}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold text-gray-800 capitalize">{g.id.replace('_', ' ')}</h3>
                                        <div className={`px-3 py-1 text-sm font-bold rounded-full flex items-center gap-2 ${ g.status === 'success' ? 'bg-green-100 text-green-800' : g.status === 'processing' ? 'bg-blue-100 text-blue-800' : g.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800' }`}>
                                            {g.status === 'processing' && <Spinner/>} {g.status}
                                        </div>
                                    </div>
                                    {g.status === 'success' && g.results && (
                                        <div className="grid grid-cols-2 gap-4">
                                             {g.results.frontMannequin && <MannequinCard garment={g} view="front" result={g.results.frontMannequin} />}
                                             {g.results.backMannequin && <MannequinCard garment={g} view="back" result={g.results.backMannequin} />}
                                        </div>
                                    )}
                                    {g.status === 'error' && <p className="text-red-600 text-sm">{g.error}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
            <footer className="text-center mt-8 text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} ZOLA AI. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default CatalogForgedPage;