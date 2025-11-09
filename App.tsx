import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import TryOnPage from './pages/TryOnPage';
import GalleryPage from './pages/GalleryPage';
import AssetGeneratorPage from './pages/AssetGeneratorPage';
import LandingPage from './pages/LandingPage';
import CatalogForgedPage from './pages/CatalogForgedPage';
import AboutPage from './pages/AboutPage';
import StyleScenePage from './pages/StyleScenePage';
import ModelGalleryPage from './pages/ModelGalleryPage';
import BackgroundGalleryPage from './pages/BackgroundGalleryPage';
import AssetCollectionPage from './pages/AssetCollectionPage';
import NotFoundPage from './pages/NotFoundPage';
import { User, GeneratedAsset, CollectionAsset } from './types';
import Layout from './components/Layout';
import OnboardingTour from './components/OnboardingTour';
import { supabase } from './services/supabase';
import { getAssetsForUser, saveAsset, getAssetsFromCollection, saveAssetToCollection, deleteAsset, deleteAssetFromCollection } from './services/db';
import Spinner from './components/Spinner';
import { PATHS } from './constants/paths';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // State for session-cached gallery
  const [galleryAssets, setGalleryAssets] = useState<GeneratedAsset[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState<boolean>(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  // State for asset collection
  const [collectionAssets, setCollectionAssets] = useState<CollectionAsset[]>([]);
  const [isCollectionLoading, setIsCollectionLoading] = useState<boolean>(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [deletingCollectionAssetId, setDeletingCollectionAssetId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();


  const fetchGalleryAssets = async (userId: string, forceRefresh: boolean = false) => {
    // Only fetch if forced, or if the gallery is currently empty.
    if (!userId || (galleryAssets.length > 0 && !forceRefresh)) {
        return;
    }

    setIsGalleryLoading(true);
    setGalleryError(null);
    try {
        const userAssets = await getAssetsForUser(userId);
        setGalleryAssets(userAssets);
    } catch (err) {
        console.error('Failed to fetch assets in App.tsx:', err);
        setGalleryError('Could not load your gallery. Please try again later.');
    } finally {
        setIsGalleryLoading(false);
    }
  };

  const fetchCollectionAssets = async (userId: string, forceRefresh: boolean = false) => {
    if (!userId || (collectionAssets.length > 0 && !forceRefresh)) {
        return;
    }
    setIsCollectionLoading(true);
    setCollectionError(null);
    try {
        const userAssets = await getAssetsFromCollection(userId);
        setCollectionAssets(userAssets);
    } catch (err) {
        console.error('Failed to fetch collection assets in App.tsx:', err);
        setCollectionError('Could not load your asset collection. Please try again later.');
    } finally {
        setIsCollectionLoading(false);
    }
  };


  const handleAssetSaved = (generatedImage: string) => {
    if (!currentUser) {
        console.error("Cannot save asset without a logged in user.");
        throw new Error("You must be logged in to save an image.");
    }

    const tempId = `temp_${Date.now()}`;
    const tempAsset: GeneratedAsset = {
        id: tempId,
        user_id: currentUser.id,
        image_url: 'optimistic_update.png', // Placeholder path
        display_url: generatedImage, // Use the full data URL for immediate display
        source_feature: 'virtual_photoshoot',
        created_at: new Date().toISOString(),
    };

    // 1. Synchronous optimistic update for immediate UI feedback.
    setGalleryAssets(prevAssets => [tempAsset, ...prevAssets]);

    // 2. "Fire-and-forget" the actual save operation in the background.
    (async () => {
        try {
            const base64Data = generatedImage.split(',')[1];
            const realAsset = await saveAsset(currentUser.id, base64Data, 'virtual_photoshoot');

            // 3. On success, replace the temporary asset with the real one.
            setGalleryAssets(prevAssets =>
                prevAssets.map(asset => (asset.id === tempId ? realAsset : asset))
            );
        } catch (error) {
            console.error("Failed to save asset in background:", error);
            // 4. On failure, silently roll back the optimistic update.
            setGalleryAssets(prevAssets => prevAssets.filter(asset => asset.id !== tempId));
        }
    })();
  };

  const handleSaveToCollection = (assetData: { imageUrl: string, asset_type: 'individual' | 'composed', item_name: string, item_category: string }) => {
    if (!currentUser) {
        console.error("Cannot save to collection without a logged in user.");
        throw new Error("You must be logged in to save an asset.");
    }

    const tempId = `temp_collection_${Date.now()}`;
    const tempAsset: CollectionAsset = {
        id: tempId,
        user_id: currentUser.id,
        image_url: 'optimistic_update.png', // Placeholder path
        display_url: assetData.imageUrl, // Full data URL for immediate display
        asset_type: assetData.asset_type,
        item_name: assetData.item_name,
        item_category: assetData.item_category,
        created_at: new Date().toISOString(),
    };
    
    setCollectionAssets(prevAssets => [tempAsset, ...prevAssets]);

    (async () => {
        try {
            const base64Data = assetData.imageUrl.split(',')[1];
            const realAsset = await saveAssetToCollection(currentUser.id, base64Data, {
                asset_type: assetData.asset_type,
                item_name: assetData.item_name,
                item_category: assetData.item_category,
            });
            setCollectionAssets(prevAssets =>
                prevAssets.map(asset => (asset.id === tempId ? realAsset : asset))
            );
        } catch (error) {
            console.error("Failed to save asset to collection in background:", error);
            setCollectionAssets(prevAssets => prevAssets.filter(asset => asset.id !== tempId));
        }
    })();
  };
  
  const handleDeleteAsset = async (assetToDelete: GeneratedAsset) => {
    if (deletingAssetId) return; // Prevent double clicks
    
    // Optimistic update
    const originalAssets = [...galleryAssets];
    setGalleryAssets(prev => prev.filter(asset => asset.id !== assetToDelete.id));
    setDeletingAssetId(assetToDelete.id);

    try {
        await deleteAsset(assetToDelete.id, assetToDelete.image_url);
    } catch (error) {
        console.error("Failed to delete asset:", error);
        // Rollback on error
        setGalleryAssets(originalAssets);
        setGalleryError("Could not delete the asset. Please try again.");
    } finally {
        setDeletingAssetId(null);
    }
  };

  const handleDeleteAssetFromCollection = async (assetToDelete: CollectionAsset) => {
    if (deletingCollectionAssetId) return; // Prevent double clicks
    
    // Optimistic update
    const originalAssets = [...collectionAssets];
    setCollectionAssets(prev => prev.filter(asset => asset.id !== assetToDelete.id));
    setDeletingCollectionAssetId(assetToDelete.id);

    try {
        await deleteAssetFromCollection(assetToDelete.id, assetToDelete.image_url);
    } catch (error) {
        console.error("Failed to delete asset from collection:", error);
        // Rollback on error
        setCollectionAssets(originalAssets);
        setCollectionError("Could not delete the asset. Please try again.");
    } finally {
        setDeletingCollectionAssetId(null);
    }
  };


  useEffect(() => {
    const processSession = async (session: import('@supabase/supabase-js').Session | null) => {
      try {
        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) console.warn('Could not fetch user profile on auth change:', profileError.message);

          const userEmail = session.user.email ?? '';
          const user: User = {
            id: session.user.id,
            email: userEmail,
            username: profile?.username || userEmail || 'ghost_user',
            avatar: profile?.avatar_url
          };
          setCurrentUser(user);
          fetchGalleryAssets(session.user.id);
          fetchCollectionAssets(session.user.id);
          
          if (location.pathname === PATHS.LANDING || location.pathname === PATHS.AUTH) {
            navigate(PATHS.HOME, { replace: true });
          }

          const tourCompleted = localStorage.getItem('zola_ai_tour_completed');
          if (!tourCompleted) {
            setTimeout(() => setIsTourActive(true), 500);
          }
        } else {
          setCurrentUser(null);
          setGalleryAssets([]);
          setCollectionAssets([]);
          const isPublicPath = location.pathname === PATHS.LANDING || location.pathname === PATHS.AUTH;
          if (!isPublicPath) {
            navigate(PATHS.LANDING, { replace: true });
          }
        }
      } catch (error) {
        console.error("Error in session processing:", error);
        setCurrentUser(null);
        setGalleryAssets([]);
        setCollectionAssets([]);
        const isPublicPath = location.pathname === PATHS.LANDING || location.pathname === PATHS.AUTH;
        if (!isPublicPath) {
          navigate(PATHS.LANDING, { replace: true });
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
        processSession(session);
    }).catch(error => {
        console.error("Error fetching initial session:", error);
        processSession(null);
    }).finally(() => {
        setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      processSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);


  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    }
    setCurrentUser(null);
    setGalleryAssets([]);
    setCollectionAssets([]);
    navigate(PATHS.LANDING);
  };
  
  const handleTourClose = () => {
    localStorage.setItem('zola_ai_tour_completed', 'true');
    setIsTourActive(false);
  };
  
  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <OnboardingTour isVisible={isTourActive} onClose={handleTourClose} />
      <Routes>
        {currentUser ? (
            <>
                {/* Routes with the main sidebar layout */}
                <Route 
                    element={
                        <Layout 
                            user={currentUser} 
                            onLogout={handleLogout} 
                            onHelpClick={() => setIsTourActive(true)}
                        />
                    }
                >
                    <Route path={PATHS.HOME} element={<HomePage user={currentUser} />} />
                    <Route path="/home" element={<Navigate to={PATHS.HOME} replace />} />
                    <Route path={PATHS.VIRTUAL_PHOTOSHOOT} element={<TryOnPage user={currentUser} onSave={handleAssetSaved} />} />
                    <Route path={PATHS.STYLE_SCENE} element={<StyleScenePage user={currentUser} />} />
                    <Route path={PATHS.ASSET_GENERATOR} element={<AssetGeneratorPage user={currentUser} onSaveToCollection={handleSaveToCollection} />} />
                    <Route path={PATHS.CATALOG_FORGED} element={<CatalogForgedPage user={currentUser} onSaveToCollection={handleSaveToCollection} />} />
                    <Route path={PATHS.GALLERY} element={
                        <GalleryPage
                            user={currentUser}
                            assets={galleryAssets}
                            isLoading={isGalleryLoading}
                            error={galleryError}
                            onRefresh={() => fetchGalleryAssets(currentUser!.id, true)}
                            onDelete={handleDeleteAsset}
                            deletingAssetId={deletingAssetId}
                        />
                    } />
                    <Route path={PATHS.ASSET_COLLECTION} element={
                        <AssetCollectionPage
                            user={currentUser}
                            assets={collectionAssets}
                            isLoading={isCollectionLoading}
                            error={collectionError}
                            onRefresh={() => fetchCollectionAssets(currentUser!.id, true)}
                            onDelete={handleDeleteAssetFromCollection}
                            deletingAssetId={deletingCollectionAssetId}
                        />
                    } />
                    <Route path={PATHS.PRICING} element={<AboutPage />} />
                    <Route path={PATHS.SETTINGS} element={<AboutPage />} />
                    <Route path={PATHS.ABOUT} element={<AboutPage />} />
                    {/* Catch-all for logged-in users shows a 404 within the app layout */}
                    <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Special routes without the main layout */}
                <Route path={PATHS.MODEL_GALLERY} element={<ModelGalleryPage onBack={() => navigate(-1)} />} />
                <Route path={PATHS.BACKGROUND_GALLERY} element={<BackgroundGalleryPage onBack={() => navigate(-1)} />} />

            </>
        ) : (
            <>
                <Route path={PATHS.AUTH} element={<AuthPage />} />
                <Route path={PATHS.LANDING} element={<LandingPage />} />
                <Route path="*" element={<Navigate to={PATHS.LANDING} replace />} />
            </>
        )}
    </Routes>
    </>
  );
};

export default App;