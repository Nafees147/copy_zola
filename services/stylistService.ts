import { GoogleGenAI, Modality } from "@google/genai";
import { ImageFile } from '../types';
import { analyzeGarmentImage } from './virtualTryOnService';

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

export async function analyzeGarmentList(garmentImages: ImageFile[]): Promise<string[]> {
    if (!garmentImages || garmentImages.length === 0) {
        throw new Error('Garment images must be provided for analysis.');
    }
    // Run analysis for each garment image sequentially to avoid rate limiting.
    const descriptions: string[] = [];
    for (const image of garmentImages) {
        const result = await analyzeGarmentImage(image!);
        descriptions.push(result.description);
    }
    return descriptions;
}

export async function generateModularOutfit(
    personImage: ImageFile,
    items: { image: ImageFile; type: string }[],
    itemDescriptions: string[]
): Promise<string> {
    try {
        if (!personImage) {
            throw new Error("Person image must be provided.");
        }
        if (!items || items.length === 0) {
            throw new Error("At least one garment item must be provided.");
        }

        const model = 'gemini-2.5-flash-image';

        const prompt = `
# INSTRUCTION: AI Stylist & Modular Outfit Builder

## ZERO_TOLERANCE_POLICY: IDENTITY LOCK
The person's face, hair, body shape, and pose from the "Person Image" MUST remain completely unchanged and identical to the source. This is the highest priority.

## PRIMARY_DIRECTIVE
You are an AI stylist. Your task is to dress the person from the "Person Image" with the provided clothing items. You must combine all items into a single, cohesive, and photorealistic outfit.

## IMAGE & ITEM LIST
- **Person Image:** The main subject. Their identity is locked.
${items.map((item, index) => `
- **Item ${index + 1} Image:** A clothing item.
  - **Type:** ${item.type}
  - **Description:** ${itemDescriptions[index]}
`).join('')}

## EXECUTION RULES
1.  **Composite Image:** Create a single output image showing the person from the "Person Image" wearing ALL the items from the "Item Images".
2.  **Realistic Layering:** The items must be layered correctly and realistically on the person's body (e.g., a shirt under a jacket, pants on the legs, shoes on the feet).
3.  **Anatomical Fit:** Ensure each garment drapes and fits the person's body naturally. Generate realistic folds, shadows, and highlights.
4.  **Full Visibility:** All provided items should be visible in the final outfit, if they would naturally be (e.g., a watch might be partially covered by a sleeve, which is acceptable).
5.  **Background:** Keep the original background from the "Person Image".

## FINAL_OUTPUT_AESTHETIC
- **Quality:** 4K, ultra-high resolution, cinematic clarity.
- **Style:** Indistinguishable from a real photograph.

## OUTPUT_FORMAT
Return ONLY the final, edited image. Do not include any text, logos, or watermarks.
`;

        const imageParts = [
            { inlineData: { data: personImage.base64, mimeType: personImage.mimeType } },
            ...items.map(item => ({ inlineData: { data: item.image!.base64, mimeType: item.image!.mimeType } }))
        ];

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [...imageParts, { text: prompt }] },
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

        throw new Error("Failed to generate the outfit. The model did not return an image part. Please try again with different images.");
    } catch (error) {
        handleGeminiError(error, 'modular outfit generation');
    }
}
