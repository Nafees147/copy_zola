import { GoogleGenAI, Modality } from "@google/genai";
import { ImageFile } from '../types';
import { MANNEQUIN_MODELS } from './mannequins';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleGeminiError = (error: any, context: string): never => {
    console.error(`Gemini API Error during ${context}:`, error);
    
    // Check for specific Gemini API error structure or 429 status code.
    // The error from the SDK might not have a clean httpStatus field, so we check the message string.
    if (error.toString().includes('RESOURCE_EXHAUSTED') || error.toString().includes('429')) {
        throw new Error("Quota Exceeded: You have exceeded your API request limit. Please check your plan and billing details on the Google AI Studio website, or try again later.");
    }

    // Generic fallback for other API errors
    const message = error.message || 'An unknown error occurred.';
    throw new Error(`An AI service error occurred during ${context}. Details: ${message}`);
};

const urlToImageFile = async (url: string): Promise<ImageFile> => {
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
        console.error(`Error converting URL to ImageFile for URL: ${url}`, error);
        throw new Error(`Could not load the mannequin model image from the provided URL. Please check the link and network connection. URL: ${url}`);
    }
};

export async function generateForgedAsset(
    garmentImage: ImageFile
): Promise<string> {
    try {
        if (!garmentImage) {
            throw new Error('Garment image must be provided.');
        }
        const model = 'gemini-2.5-flash-image';
        const prompt = `# ULTRA-FINAL, TECHNICAL MANDATE: Catalog|Forged (Product Asset Perfection)
## Ultimate Goal
To deliver a technically flawless, hyper-sharp, 4K product asset that embodies 100% "BRAND NEW" condition, free from ANY imperfections, strictly adhering to the highest e-commerce marketplace standards for pristine garment presentation.

## 1. AI Execution (ZERO-TOLERANCE: ABSOLUTE PRISTINE CONDITION)
The AI engine's primary objective is to execute the "Pre-shoot preparation" digitally with ABSOLUTE ZERO TOLERANCE for any form of imperfection.

### E.1: Identity Lock
- **Requirement:** The core design (Pattern, Logo, Prints, Cut, and Original Hue) of the garment MUST be preserved without alteration.

### E.2: ABSOLUTE & FLAWLESS SURFACE PURIFICATION (CRITICAL MANDATE)
- **Requirement:** The AI MUST employ advanced pixel-level inpainting and textural reconstruction algorithms to achieve a perfectly smooth, unblemished surface. This includes:
  - **100% Wrinkle & Crease Elimination:** Absolutely NO visible wrinkles, folds, or creases.
  - **100% Spotless Removal:** Eradicate ALL dust, lint, specks, or stains.
  - **100% Thread & Tag Removal:** Eliminate ALL loose threads, stray fibers, or visible internal/external tags (unless part of the front design).
  - **100% Faded & Distressed Color Restoration:** Purify and saturate ALL colors to their vibrant, original "factory new" state. There must be NO muted, faded, washed-out, or distressed appearance. The blue in the example image MUST be deepened to the rich, dark, saturated blue of a brand-new garment.

### E.3: SHARPNESS & CRISPNESS (TECHNICAL MANDATE)
- **Requirement:** The image MUST be rendered with maximum possible sharpness and crispness to showcase ULTRA-DETAILED 4K CLARITY in every stitch, fabric weave, and graphic element. The clarity MUST be hyper-realistic, exceeding typical photographic sharpness.

### E.4: PERFECT SHAPE & SYMMETRY (TECHNICAL MANDATE)
- **Requirement:** The AI MUST apply a geometric correction model to rectify any distortion, squishing, or unevenness, rendering the garment in its ideal, symmetrical, perfectly flat, and unwarped form.

### E.5: 4K Output Resolution
- **Requirement:** The final image resolution MUST be 4K (minimum 3840 x 2160 pixels).

## 2. Final Output Generation (Aesthetic & Environment)
The output must be rendered to achieve a visually stunning, e-commerce-ready presentation.

### 0.1: Background Mandate
- **Requirement:** The final output MUST feature a rustic wooden texture background that is an EXACT REPLICA of the benchmark image's background (identical wood tone, vertical plank orientation, and subtle Depth of Field/Bokeh).

### 0.2: 3D Realism & Presentation
- **Requirement:** The garment must be rendered with hyper-realistic 3D quality and drape and EXACTLY THE SAME subtle, natural cast shadows beneath the garment, mimicking its precise lift and depth as seen in the benchmark.

### 0.3: Lighting
- **Requirement:** Apply professional, soft, diffused studio lighting that EXACTLY REPLICATES the lighting fall-off present in the benchmark image.

### 0.4: Speed Target
- **Requirement:** The entire process MUST be completed within 10 to 15 seconds.

## OUTPUT_FORMAT
Return ONLY the final, forged image. Do not include any text, logos, or watermarks.`;
        
        const garmentImagePart = { inlineData: { data: garmentImage.base64, mimeType: garmentImage.mimeType } };

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [garmentImagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
        }
        throw new Error("Failed to generate a valid image. The model did not return an image part. Please try a different source image.");
    } catch (error) {
        handleGeminiError(error, 'forged asset generation');
    }
}

export async function generateMannequinModel(
    perfectedGarmentImage: ImageFile
): Promise<string> {
    try {
        if (!perfectedGarmentImage) {
            throw new Error('Perfected garment image must be provided.');
        }
        const model = 'gemini-2.5-flash-image';
        const prompt = `# INSTRUCTION: AI Ghost Mannequin Conversion

## PRIMARY DIRECTIVE
Your sole task is to convert the provided high-quality, flat-lay product image into a professional "ghost mannequin" or "hollow man" e-commerce asset.

## CONTEXT
The input image is a digitally perfected, 4K, wrinkle-free product shot. You do not need to perform any cleaning or correction on the garment itself. Your focus is exclusively on the 3D presentation.

## EXECUTION RULES (NON-NEGOTIABLE)

### 1. Garment Reconstruction & Draping
- Analyze the 2D flat-lay image to infer the garment's 3D structure.
- Render the garment as if it is being worn by an invisible model, giving it a realistic 3D shape, volume, and natural drape.

### 2. Intelligent Inpainting (Hollow Man Effect)
- The neck, arm, and waist openings MUST be visible and realistically filled in.
- Reconstruct the inside of the garment (e.g., the back of the collar, internal lining) where it would be visible in a real mannequin shot.

### 3. Fidelity Preservation
- The color, logo, texture, and sharpness of the source garment MUST be perfectly preserved in the final output. There should be zero degradation in quality.

### 4. Background & Shadowing
- The background MUST be a pure, solid white (#FFFFFF).
- Apply subtle, soft, and realistic ground shadows beneath the garment to give it depth and make it appear grounded in the space.

## PERFORMANCE
- **Target Speed:** Complete the generation in under 15 seconds.

## OUTPUT_FORMAT
Return ONLY the final, edited image. Do not include any text, logos, or watermarks.`;

        const garmentImagePart = { inlineData: { data: perfectedGarmentImage.base64, mimeType: perfectedGarmentImage.mimeType } };
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [garmentImagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
        }
        throw new Error("Failed to generate a valid image. The model did not return an image part for the mannequin model.");
    } catch (error) {
        handleGeminiError(error, 'mannequin model generation');
    }
}

export async function generatePerfectedMannequin(
    garmentImage: ImageFile,
    view: 'front' | 'back',
    gender: 'Male' | 'Female',
    garmentType: 'upper' | 'lower' | 'full'
): Promise<string> {
    try {
        if (!garmentImage) throw new Error('Garment image must be provided.');
        if (!gender || !garmentType) throw new Error('Gender and garment type must be provided.');

        const model = 'gemini-2.5-flash-image';

        // 1. Select and fetch the correct mannequin model image
        let mannequinUrl = '';
        if (gender === 'Male') {
            if (garmentType === 'upper') {
                mannequinUrl = MANNEQUIN_MODELS.male.upper[view];
            } else if (garmentType === 'lower') {
                mannequinUrl = MANNEQUIN_MODELS.male.lower[view];
            }
        } else { // Female
            mannequinUrl = MANNEQUIN_MODELS.female.full[view];
        }

        if (!mannequinUrl) {
            throw new Error(`Could not find a mannequin model for the selection: ${gender}/${garmentType}/${view}.`);
        }

        const mannequinImageFile = await urlToImageFile(mannequinUrl);
        if (!mannequinImageFile) {
             throw new Error('Failed to load the mannequin model image.');
        }

        // 2. Define the prompt for virtual try-on
        const prompt = `# ROLE: AI Digital Stylist for E-commerce Mannequins

## GOAL
To perform a flawless, hyper-realistic virtual try-on, dressing the provided mannequin model with the user's garment.

## IMAGE CONTEXT
- **Image 1 (Garment):** This is the user-provided clothing item.
- **Image 2 (Mannequin):** This is the static mannequin model.

## CRITICAL EXECUTION INSTRUCTIONS

1.  **PERFECT GARMENT TRANSFER:**
    -   Your primary task is to take the garment from "Image 1" and perfectly fit it onto the mannequin in "Image 2".
    -   Preserve 100% of the garment's visual identity: color, pattern, texture, logos, and design details must be an exact match.

2.  **REALISTIC 3D DRAPING:**
    -   Do not simply overlay the garment. You MUST simulate a 3D drape, making the fabric conform realistically to the mannequin's contours.
    -   Generate natural-looking folds, creases, and shadows that respect the mannequin's pose and the fabric's properties.

3.  **MANNEQUIN INTEGRITY:**
    -   The mannequin's pose, shape, color, and lighting MUST remain completely unchanged. You are only adding the garment to it.
    -   The final image should look like the mannequin was originally photographed wearing the garment.

4.  **SEAMLESS INTEGRATION:**
    -   Ensure there are no harsh edges or "cut-out" looks. The garment must blend perfectly with the mannequin.
    -   The lighting on the garment must be adjusted to perfectly match the existing studio lighting on the mannequin.

## OUTPUT SPECIFICATIONS
- **Quality:** 4K, hyper-realistic, indistinguishable from a real studio photograph.
- **Background:** Preserve the original pure white background from the mannequin image.
- **Format:** Return ONLY the final, edited image of the dressed mannequin. No text, logos, or watermarks.`;
        
        // 3. Prepare parts for the API call
        const garmentImagePart = { inlineData: { data: garmentImage.base64, mimeType: garmentImage.mimeType } };
        const mannequinImagePart = { inlineData: { data: mannequinImageFile.base64, mimeType: mannequinImageFile.mimeType } };

        // 4. Call the Gemini API
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [garmentImagePart, mannequinImagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        // 5. Process the response
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
        }
        throw new Error("Failed to generate a valid image. The model did not return an image part.");

    } catch (error) {
        // Using the existing error handler
        handleGeminiError(error, 'mannequin dressing generation');
    }
}
