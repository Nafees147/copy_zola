import { supabase } from './supabase';
import { GeneratedAsset, CollectionAsset } from '../types';

// Helper to convert a data URL string to a File object for uploading
const dataURLtoFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || 'image/png' });
};

// Saves a generated asset by uploading to storage and inserting into the database
export async function saveAsset(
    userId: string,
    generatedImageBase64: string,
    sourceFeature: string
): Promise<GeneratedAsset> {
    if (!userId || !generatedImageBase64) {
        throw new Error('User ID and image data are required.');
    }

    const imageFile = await dataURLtoFile(`data:image/png;base64,${generatedImageBase64}`, `asset-${Date.now()}.png`);
    const filePath = `${userId}/${imageFile.name}`;

    try {
        // 1. Upload the file to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('generated_assets')
            .upload(filePath, imageFile, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            throw uploadError;
        }

        // 2. Insert the asset metadata and select the new record
        const { data: newAsset, error: insertError } = await supabase
            .from('generated_assets')
            .insert({
                user_id: userId,
                image_url: filePath, // Store the file path
                source_feature: sourceFeature,
            })
            .select()
            .single();

        if (insertError) {
            // If DB insert fails, remove the orphaned storage object for cleanup
            await supabase.storage.from('generated_assets').remove([filePath]);
            throw insertError;
        }
        
        if (!newAsset) {
            throw new Error('Failed to create asset in database.');
        }

        // 3. Generate a signed URL for the newly created asset
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('generated_assets')
            .createSignedUrls([filePath], 60 * 5); // 5 minute validity

        if (signedUrlError) {
            // Throw if getting the URL fails to ensure the caller knows the process is incomplete.
            throw signedUrlError;
        }
        if (!signedUrlData?.[0]?.signedUrl) {
            throw new Error("Storage upload succeeded, but failed to generate a viewable URL.");
        }

        // 4. Return the complete asset object with the temporary signed URL
        return {
            ...newAsset,
            display_url: signedUrlData[0].signedUrl,
        };

    } catch (error) {
        console.error('Error saving asset to Supabase:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to save asset: ${error.message}`);
        }
        throw new Error('An unknown error occurred while saving the asset.');
    }
}

// Fetches all assets for a given user and generates secure, temporary URLs for viewing
export async function getAssetsForUser(userId: string): Promise<GeneratedAsset[]> {
    try {
        // 1. Fetch asset records from the database
        const { data: assets, error } = await supabase
            .from('generated_assets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!assets || assets.length === 0) return [];

        // 2. Extract the file paths from the asset records
        const paths = assets.map(asset => asset.image_url);

        // 3. Generate signed URLs for all file paths in a single batch request
        const { data: signedUrlsData, error: signedUrlError } = await supabase
            .storage
            .from('generated_assets')
            .createSignedUrls(paths, 60 * 5); // URLs are valid for 5 minutes

        if (signedUrlError) throw signedUrlError;

        // 4. Map the signed URLs back to their corresponding asset objects
        const assetsWithSignedUrls = assets.map(asset => {
            const signedUrlData = signedUrlsData.find(d => d.path === asset.image_url);
            return {
                ...asset,
                // Add the temporary signed URL for the UI to use
                display_url: signedUrlData ? signedUrlData.signedUrl : '', 
            };
        }).filter(asset => asset.display_url !== ''); // Filter out any that failed to get a URL

        return assetsWithSignedUrls;

    } catch (error) {
        console.error('Error fetching assets from Supabase:', error);
        throw new Error('Failed to retrieve assets.');
    }
}

// Deletes an asset from the database and storage
export async function deleteAsset(assetId: string, imagePath: string): Promise<void> {
    try {
        // First, delete the database record. If this fails, we don't orphan the storage object.
        const { error: dbError } = await supabase
            .from('generated_assets')
            .delete()
            .eq('id', assetId);
        
        if (dbError) {
            throw dbError;
        }

        // If the database record is gone, delete the storage object.
        const { error: storageError } = await supabase.storage
            .from('generated_assets')
            .remove([imagePath]);
        
        if (storageError) {
            // Log this, but at this point the DB record is gone, so we can't easily roll back.
            // This is a tradeoff of not using a transaction-like function.
            console.warn(`Storage object ${imagePath} could not be deleted, but DB record was removed.`, storageError);
        }
    } catch (error) {
        console.error('Error deleting asset:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to delete asset: ${error.message}`);
        }
        throw new Error('An unknown error occurred while deleting the asset.');
    }
}


// --- Asset Collection Storage ---
const ASSET_COLLECTION_BUCKET = 'Asset_Collection';

export async function saveAssetToCollection(
    userId: string,
    imageBase64: string,
    metadata: {
        asset_type: 'individual' | 'composed';
        item_name: string;
        item_category: string;
    }
): Promise<CollectionAsset> {
    if (!userId || !imageBase64) {
        throw new Error('User ID and image data are required.');
    }

    const imageFile = await dataURLtoFile(`data:image/png;base64,${imageBase64}`, `asset_collection_${Date.now()}.png`);
    const filePath = `${userId}/${imageFile.name}`;

    try {
        // 1. Upload file to storage
        const { error: uploadError } = await supabase.storage
            .from(ASSET_COLLECTION_BUCKET)
            .upload(filePath, imageFile, { upsert: false });

        if (uploadError) throw uploadError;

        // 2. Insert metadata into the database
        const { data: newAsset, error: insertError } = await supabase
            .from('asset_collection')
            .insert({
                user_id: userId,
                image_url: filePath,
                asset_type: metadata.asset_type,
                item_name: metadata.item_name,
                item_category: metadata.item_category,
            })
            .select()
            .single();

        if (insertError) {
            await supabase.storage.from(ASSET_COLLECTION_BUCKET).remove([filePath]);
            throw insertError;
        }
        if (!newAsset) {
            throw new Error('Failed to create asset in database.');
        }

        // 3. Generate signed URL for immediate display
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(ASSET_COLLECTION_BUCKET)
            .createSignedUrls([filePath], 60 * 5); // 5 minutes

        if (signedUrlError) throw signedUrlError;
        if (!signedUrlData?.[0]?.signedUrl) throw new Error("Storage upload succeeded, but failed to generate a viewable URL.");

        return {
            ...newAsset,
            display_url: signedUrlData[0].signedUrl,
        };

    } catch (error) {
        console.error('Error saving asset to collection:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to save asset to collection: ${error.message}`);
        }
        throw new Error('An unknown error occurred while saving the asset to collection.');
    }
}

export async function getAssetsFromCollection(userId: string): Promise<CollectionAsset[]> {
    try {
        // 1. Fetch asset records
        const { data: assets, error } = await supabase
            .from('asset_collection')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!assets || assets.length === 0) return [];

        // 2. Get signed URLs
        const paths = assets.map(asset => asset.image_url);
        const { data: signedUrlsData, error: signedUrlError } = await supabase
            .storage
            .from(ASSET_COLLECTION_BUCKET)
            .createSignedUrls(paths, 60 * 5); // 5 mins

        if (signedUrlError) throw signedUrlError;

        // 3. Map URLs back to assets
        const assetsWithSignedUrls = assets.map(asset => {
            const signedUrlData = signedUrlsData.find(d => d.path === asset.image_url);
            return {
                ...asset,
                display_url: signedUrlData ? signedUrlData.signedUrl : '',
            };
        }).filter(asset => asset.display_url !== '');

        return assetsWithSignedUrls;

    } catch (error) {
        console.error('Error fetching assets from collection:', error);
        throw new Error('Failed to retrieve assets from collection.');
    }
}

export async function deleteAssetFromCollection(assetId: string, imagePath: string): Promise<void> {
    try {
        // First, delete the database record.
        const { error: dbError } = await supabase
            .from('asset_collection')
            .delete()
            .eq('id', assetId);
        
        if (dbError) {
            throw dbError;
        }

        // If the database record is gone, delete the storage object.
        const { error: storageError } = await supabase.storage
            .from(ASSET_COLLECTION_BUCKET)
            .remove([imagePath]);
        
        if (storageError) {
            // Log this, but the DB record is gone, so we can't easily roll back.
            console.warn(`Storage object ${imagePath} could not be deleted, but DB record was removed.`, storageError);
        }
    } catch (error) {
        console.error('Error deleting asset from collection:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to delete asset from collection: ${error.message}`);
        }
        throw new Error('An unknown error occurred while deleting asset from collection.');
    }
}


// --- StyleScene Collection Storage ---

const STYLE_SCENE_BUCKET = 'style_scene_collections';

/**
 * Uploads a generated StyleScene image to Supabase Storage.
 * @param userId The ID of the current user.
 * @param poseId The ID of the pose, used for organization.
 * @param generatedImageBase64 The base64 string of the image to upload.
 * @returns The public URL of the uploaded image.
 */
export async function uploadStyleSceneImage(
    userId: string,
    poseId: string,
    generatedImageBase64: string
): Promise<string> {
    if (!userId || !poseId || !generatedImageBase64) {
        throw new Error('User ID, Pose ID, and image data are required for upload.');
    }

    const imageFile = await dataURLtoFile(`data:image/png;base64,${generatedImageBase64}`, `stylescene-${Date.now()}.png`);
    const filePath = `${userId}/${poseId}/${imageFile.name}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from(STYLE_SCENE_BUCKET)
            .upload(filePath, imageFile, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from(STYLE_SCENE_BUCKET)
            .getPublicUrl(filePath);
        
        if (!data.publicUrl) {
            throw new Error('Could not retrieve public URL for the uploaded image.');
        }

        return data.publicUrl;

    } catch (error) {
        console.error('Error uploading StyleScene image to Supabase:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to upload image: ${error.message}`);
        }
        throw new Error('An unknown error occurred while uploading the StyleScene image.');
    }
}

/**
 * Deletes a user's entire folder from the StyleScene collection bucket.
 * Used when the user starts a new session with a new garment.
 * @param userId The ID of the user whose folder should be deleted.
 */
export async function deleteUserStyleSceneFolder(userId: string): Promise<void> {
    try {
        // FIX: The `recursive` option for `list()` is not valid. This function now
        // manually lists and removes files from subdirectories to clear the user's folder.
        const { data: topLevelFolders, error: listError } = await supabase.storage
            .from(STYLE_SCENE_BUCKET)
            .list(userId, { limit: 1000 });

        if (listError) {
            if (listError.message.includes('Object not found')) {
                console.log(`No folder to delete for user ${userId}.`);
                return;
            }
            throw listError;
        }

        if (topLevelFolders && topLevelFolders.length > 0) {
            const allFilePaths: string[] = [];
            
            await Promise.all(
                topLevelFolders.map(async (folder) => {
                    const subfolderPath = `${userId}/${folder.name}`;
                    const { data: filesInSubfolder, error: subfolderError } = await supabase.storage
                        .from(STYLE_SCENE_BUCKET)
                        .list(subfolderPath);
                    
                    if (subfolderError) {
                        console.warn(`Could not list files in ${subfolderPath}`, subfolderError);
                        return; // Continue to next folder
                    }
                    
                    if (filesInSubfolder && filesInSubfolder.length > 0) {
                        const paths = filesInSubfolder.map(f => `${subfolderPath}/${f.name}`);
                        allFilePaths.push(...paths);
                    }
                })
            );
            
            if (allFilePaths.length > 0) {
                const { error: removeError } = await supabase.storage
                    .from(STYLE_SCENE_BUCKET)
                    .remove(allFilePaths);

                if (removeError) {
                    throw removeError;
                }
            }
        }
    } catch (error) {
        console.error(`Error deleting StyleScene folder for user ${userId}:`, error);
        // We don't re-throw here to prevent the UI from breaking on a cleanup failure.
    }
}

// --- Catalog Forged Output Storage ---
const CATALOG_SESSIONS_BUCKET = 'catalog_forged_outputs';

export async function uploadCatalogSessionImage(
    userId: string,
    garmentId: string,
    view: string,
    imageBase64: string
): Promise<string> {
    if (!userId || !garmentId || !view || !imageBase64) {
        throw new Error('User ID, garment ID, view, and image data are required.');
    }
    const fileName = `${view}-${Date.now()}.png`;
    const imageFile = await dataURLtoFile(`data:image/png;base64,${imageBase64}`, fileName);
    const filePath = `${userId}/${garmentId}/${fileName}`;
    try {
        const { error } = await supabase.storage
            .from(CATALOG_SESSIONS_BUCKET)
            .upload(filePath, imageFile, { upsert: true });
        if (error) throw error;
        return filePath;
    } catch (error) {
        console.error('Error uploading catalog session image:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to upload session image: ${error.message}`);
        }
        throw new Error('An unknown error occurred while uploading session image.');
    }
}

export async function getSignedUrlsForCatalogSession(paths: string[]): Promise<Map<string, string>> {
    const urlMap = new Map<string, string>();
    if (paths.length === 0) return urlMap;
    try {
        const { data, error } = await supabase.storage
            .from(CATALOG_SESSIONS_BUCKET)
            .createSignedUrls(paths, 60 * 5); // 5 minute validity
        if (error) throw error;
        if (data) {
            for (const item of data) {
                if (item.path && item.signedUrl) urlMap.set(item.path, item.signedUrl);
            }
        }
        return urlMap;
    } catch (error) {
        console.error('Error getting signed URLs for catalog session:', error);
        throw new Error('Failed to retrieve session image URLs.');
    }
}

export async function deleteUserCatalogSessionFolder(userId: string): Promise<void> {
    if (!userId) return;
    try {
        // FIX: The `recursive` option for `list()` is not valid. This function now
        // manually lists and removes files from subdirectories to clear the user's folder.
        const { data: folders, error } = await supabase.storage
            .from(CATALOG_SESSIONS_BUCKET)
            .list(userId, { limit: 1000 });
        if (error) {
            if (error.message.includes('Object not found')) return;
            throw error;
        }
        if (folders && folders.length > 0) {
            const pathsToRemove: string[] = [];

            await Promise.all(
                folders.map(async (folder) => {
                    const subfolderPath = `${userId}/${folder.name}`;
                    const { data: filesInFolder, error: subfolderError } = await supabase.storage
                        .from(CATALOG_SESSIONS_BUCKET)
                        .list(subfolderPath);

                    if (subfolderError) {
                        console.warn(`Could not list files in ${subfolderPath}`, subfolderError);
                        return; // Continue to next folder
                    }

                    if (filesInFolder && filesInFolder.length > 0) {
                        const paths = filesInFolder.map(f => `${subfolderPath}/${f.name}`);
                        pathsToRemove.push(...paths);
                    }
                })
            );
            
            if (pathsToRemove.length > 0) {
                const { error: removeError } = await supabase.storage.from(CATALOG_SESSIONS_BUCKET).remove(pathsToRemove);
                if (removeError) {
                    throw removeError;
                }
            }
        }
    } catch (error) {
        console.error(`Error deleting catalog session folder for user ${userId}:`, error);
    }
}
