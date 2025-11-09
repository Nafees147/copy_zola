import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ImageFile, ExtractedAsset } from '../types';

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

export async function classifyGarmentsInImage(
    sourceImage: ImageFile
): Promise<{ upperBody: boolean, lowerBody: boolean }> {
    try {
        if (!sourceImage) {
            throw new Error("Source image must be provided for classification.");
        }
        const model = 'gemini-2.5-flash';
        const prompt = `# ROLE: AI Garment Visibility Analyst

## TASK
Your task is to analyze an image of a person and determine if distinct upper and lower body garments are *clearly visible and identifiable*. Your analysis must be strict.

## DEFINITIONS
- **Upper Body Garment:** A shirt, t-shirt, jacket, top, blouse, etc.
- **Lower Body Garment:** Pants, jeans, skirt, shorts, etc.
- **Full Outfit:** A single garment that covers both, like a dress, gown, or jumpsuit.

## RULES
1.  **Visibility is Key:** If a body part is not shown in the image, you cannot assume a garment is present.
2.  **Partial View:** If the image only shows the person from the waist up, you MUST classify \`lowerBody\` as \`false\`.
3.  **Full Outfits:** If the garment is a single piece like a dress or jumpsuit, you MUST classify BOTH \`upperBody\` and \`lowerBody\` as \`true\` as it covers both areas.

## OUTPUT FORMAT
Respond ONLY with a JSON object containing two boolean properties: "upperBody" and "lowerBody".

## EXAMPLES
- **Image shows a person in a t-shirt and jeans:** \`{"upperBody": true, "lowerBody": true}\`
- **Image is a portrait showing only a person's head and shoulders wearing a jacket:** \`{"upperBody": true, "lowerBody": false}\`
- **Image shows a person from the knees down wearing pants and shoes:** \`{"upperBody": false, "lowerBody": true}\`
- **Image shows a person wearing a full-length dress:** \`{"upperBody": true, "lowerBody": true}\``;

        const imagePart = {
            inlineData: {
                data: sourceImage.base64,
                mimeType: sourceImage.mimeType,
            },
        };
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        upperBody: { type: Type.BOOLEAN },
                        lowerBody: { type: Type.BOOLEAN },
                    },
                    required: ["upperBody", "lowerBody"],
                },
            },
        });

        const jsonText = response.text.trim();
        try {
            const result = JSON.parse(jsonText);
            if (typeof result.upperBody === 'boolean' && typeof result.lowerBody === 'boolean') {
                return result;
            } else {
                console.error("Received malformed JSON for garment classification:", result);
                throw new Error("Invalid JSON format from API during garment classification.");
            }
        } catch (e) {
            console.error("Error parsing garment classification JSON:", e);
            throw new Error("Failed to parse garment classification.");
        }
    } catch (error) {
        handleGeminiError(error, 'garment classification');
    }
}


export async function extractAssetsFromImage(
    sourceImage: ImageFile,
    extractionScope: 'full' | 'upper' | 'lower',
    gender: 'Male' | 'Female'
): Promise<ExtractedAsset[]> {
    try {
        if (!sourceImage) {
            throw new Error("Source image must be provided.");
        }
        const model = 'gemini-2.5-flash-image';
        let taskInstruction = '';

        if (gender === 'Female' && extractionScope === 'full') {
            taskInstruction = 'You MUST extract ONLY the main, single, full-body garment (e.g., a dress, gown, jumpsuit, saree) visible in the image. Generate one "Front" view for it. The output JSON for this item MUST use the category "Full Outfit". This is the ONLY item you should generate.';
        } else {
            switch (extractionScope) {
                case 'full':
                    taskInstruction = 'You MUST extract BOTH the upper body garment AND the lower body garment visible in the image. Generate one "Front" view for each of these two items. These are the ONLY two items you should generate.';
                    break;
                case 'upper':
                    taskInstruction = 'You MUST extract ONLY the upper body garment (e.g., shirt, jacket, top) visible in the image. Generate one "Front" view for it. This is the ONLY item you should generate.';
                    break;
                case 'lower':
                    taskInstruction = 'You MUST extract ONLY the lower body garment (e.g., pants, skirt, shorts) visible in the image. Generate one "Front" view for it. This is the ONLY item you should generate.';
                    break;
            }
        }

        const prompt = `# ROLE: High-Speed E-commerce Asset Generator

# CONTEXT (CRITICAL)
- **Subject Gender:** ${gender}
- **CRITICAL NOTE FOR 'FEMALE' GENDER:** You MUST be prepared to handle complex and ethnic wear like a 'Saree'. A Saree is a single, long piece of draped fabric, often worn with a blouse. When extracting a Saree, you must treat the entire drape and the accompanying blouse as a single "Full Outfit" or "Upper Body" set. DO NOT misinterpret it as a simple top and skirt or reduce it to a bra/bikini top. Preserve the full, flowing structure.

# PRIMARY_DIRECTIVE (CRITICAL)
Your SOLE function is to perform an ultra-fast extraction of the apparel item(s) specified in the TASK_INSTRUCTION. You must complete the entire process within 15-20 seconds. Speed and accuracy on the requested item(s) are the only priorities.

# EXECUTION_PROTOCOL
1. **Analyze Scope:** Immediately identify the garment(s) to be extracted based on the TASK_INSTRUCTION and the GENDER CONTEXT.
2. **Segment & Inpaint:** Isolate the selected garment(s) and generate a perfect "ghost mannequin" / "hollow man" effect.
3. **Render:** Output the final image(s) according to the specifications below.

# TASK_INSTRUCTION (MANDATORY)
${taskInstruction}

# STRICT_EXCLUSIONS
- **DO NOT** generate Back or Side views. Only the Front view is required.
- **DO NOT** extract accessories, footwear, or any items not explicitly requested in the TASK_INSTRUCTION.

# IMAGE_SPECIFICATIONS
- **Background:** Pure white (#FFFFFF).
- **Style:** Professional 'ghost mannequin' effect. The garment must look like it's on an invisible model, showing its 3D form.
- **Quality:** Photorealistic, studio lighting, high-resolution.
- **View:** Front View ONLY.
- **CENTER ALIGNMENT (MANDATORY):** The isolated garment MUST be centered horizontally and vertically on the output canvas. It must not be cropped to the edges but should be framed with an even margin of pure white space on all sides.

# OUTPUT_FORMAT_SPECIFICATION
Your response MUST be a strict sequence of a JSON object followed by its corresponding image data for each item.
- **Example for 'full' scope:**
{"category": "Upper Body", "itemName": "Blue T-Shirt", "view": "Front"}
[IMAGE_DATA_FOR_SHIRT]
{"category": "Lower Body", "itemName": "Denim Jeans", "view": "Front"}
[IMAGE_DATA_FOR_JEANS]
- **Example for 'upper' scope:**
{"category": "Upper Body", "itemName": "Blue T-Shirt", "view": "Front"}
[IMAGE_DATA_FOR_SHIRT]

Failure to adhere to this format will break the processing pipeline.`;

        const imagePart = {
            inlineData: {
                data: sourceImage.base64,
                mimeType: sourceImage.mimeType,
            },
        };
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const assetsMap: Map<string, ExtractedAsset> = new Map();

        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
            const parts = response.candidates[0].content.parts;
            const metadataParts: any[] = [];
            const imageParts: any[] = [];
            for (const part of parts) {
                if (part.text) {
                    const jsonStrings = part.text.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/g);
                    if (jsonStrings) {
                        for (const jsonString of jsonStrings) {
                            try {
                                const parsed = JSON.parse(jsonString);
                                if (Array.isArray(parsed)) {
                                    metadataParts.push(...parsed);
                                } else {
                                    metadataParts.push(parsed);
                                }
                            } catch (e) {
                                console.warn("Skipping malformed JSON string within a text part:", jsonString, e);
                            }
                        }
                    }
                } else if (part.inlineData) {
                    imageParts.push(part.inlineData);
                }
            }
            
            const numPairs = Math.min(metadataParts.length, imageParts.length);
            if (numPairs < metadataParts.length || numPairs < imageParts.length) {
                console.warn("Mismatch in metadata and image parts count. Metadata:", metadataParts.length, "Images:", imageParts.length);
            }

            for (let i = 0; i < numPairs; i++) {
                const metadata = metadataParts[i];
                const inlineData = imageParts[i];
                if (!metadata) continue;

                const { category, itemName, view } = metadata;
                if (!category || !itemName || !view) {
                    console.warn("Skipping incomplete metadata object:", metadata);
                    continue;
                }

                const key = `${category}-${itemName}`;
                if (!assetsMap.has(key)) {
                    assetsMap.set(key, {
                        category: category,
                        itemName: itemName,
                        views: [],
                    });
                }
                const asset = assetsMap.get(key)!;
                asset.views.push({
                    viewType: view,
                    imageBase64: inlineData.data,
                });
            }
        }

        const generatedAssets = Array.from(assetsMap.values());
        if (generatedAssets.length === 0) {
            console.error("Asset extraction failed. No valid asset pairs were generated. Raw response from model:", JSON.stringify(response, null, 2));
            throw new Error("Processing failed. Please try a clearer image.");
        }
        return generatedAssets;
    } catch (error) {
        handleGeminiError(error, 'asset extraction');
    }
}

export async function composeOutfit(
    upperBodyAsset: ImageFile,
    lowerBodyAsset: ImageFile,
    gender: 'Male' | 'Female'
): Promise<string> {
    try {
        if (!upperBodyAsset || !lowerBodyAsset) {
            throw new Error("Both upper and lower body assets must be provided.");
        }

        const model = 'gemini-2.5-flash-image';

        const prompt = `# ROLE: AI Master Tailor for Ghost Mannequin Composites

## ZERO_TOLERANCE_POLICY: PRESERVE GARMENT STRUCTURE & PROPORTION
THIS IS YOUR PRIMARY DIRECTIVE. You MUST preserve the original shape, volume, and proportions of each source garment. The final composite must look like a natural, well-proportioned outfit.
**FAILURE CONDITION:** Any "collapsing," shrinking, unnatural pinching at the waist, or distortion of the garments is a critical failure. The final silhouette must be realistic and anatomically correct for the specified gender.

## CONTEXT
- **Subject Gender:** ${gender}

## PRIMARY_DIRECTIVE
Merge two separate ghost mannequin assets (an upper and a lower body garment) into a single, seamless, and photorealistic full-outfit composite.

## SOURCE IMAGES
- **Image 1:** The Upper Body Garment.
- **Image 2:** The Lower Body Garment.

## EXECUTION PROTOCOL

1.  **3D Shape Analysis:** Infer the 3D structure and material properties of each garment.

2.  **Virtual Mannequin Draping:** Re-drape both garments together onto a single, neutral ghost mannequin form appropriate for the specified gender. This is NOT simple 2D layering.

3.  **Seamless Waistline Synthesis (CRITICAL):**
    - Render a flawless connection at the waist. The top must sit naturally OVER or tuck INTO the bottom.
    - **NO GAPS, NO OVERLAPS:** There must be no visible seam, gap, or unnatural overlap.
    - **CONTINUOUS SILHOUETTE:** The final outfit must have a continuous, believable shape. Avoid any "pinched" or "collapsed" appearance.

4.  **Unified Lighting & Shadow:**
    - Create a single, consistent lighting model across the entire outfit.
    - Shadows from the upper garment must fall realistically onto the lower garment.
    - The entire outfit must cast a single, soft ground shadow.

## AESTHETIC REQUIREMENTS
- **Background:** Pure White (#FFFFFF).
- **Quality:** Photorealistic, 4K clarity. Maintain all original texture and detail.
- **Proportions:** The final composed outfit must have realistic human proportions.

## OUTPUT_FORMAT
Return ONLY the final, merged image. Do not include any text or watermarks.`;

        const upperBodyPart = { inlineData: { data: upperBodyAsset.base64, mimeType: upperBodyAsset.mimeType } };
        const lowerBodyPart = { inlineData: { data: lowerBodyAsset.base64, mimeType: lowerBodyAsset.mimeType } };

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [upperBodyPart, lowerBodyPart, { text: prompt }] },
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
        throw new Error("Failed to generate the composed outfit. The model did not return an image part.");
    } catch (error) {
        handleGeminiError(error, 'outfit composition');
    }
}