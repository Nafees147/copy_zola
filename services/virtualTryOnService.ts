import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ImageFile } from '../types';

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

export async function detectGender(
    personImage: ImageFile
): Promise<'Male' | 'Female' | 'Unknown'> {
    try {
        if (!personImage) {
            throw new Error("Person image must be provided for gender detection.");
        }
        const model = 'gemini-2.5-flash';
        const prompt = `Analyze the provided image of a person and identify their gender.
Respond with a JSON object containing a single key "gender".
The value for "gender" must be one of the following strings: "Male", "Female", or "Unknown".

Example response:
{"gender": "Female"}`;

        const imagePart = {
            inlineData: {
                data: personImage.base64,
                mimeType: personImage.mimeType,
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
                        gender: { type: Type.STRING },
                    },
                    required: ["gender"],
                },
            },
        });

        const jsonText = response.text.trim();
        try {
            const result = JSON.parse(jsonText);
            if (result.gender && ["Male", "Female", "Unknown"].includes(result.gender)) {
                return result.gender;
            } else {
                console.warn("Gender detection returned an unexpected value:", result.gender);
                return 'Unknown';
            }
        } catch (e) {
            console.error("Error parsing gender detection JSON:", e, "Raw text:", jsonText);
            return 'Unknown';
        }
    } catch (error) {
        handleGeminiError(error, 'gender detection');
    }
}

export async function detectGarmentGender(
    garmentImage: ImageFile,
    selectedGender: 'Male' | 'Female'
): Promise<'Male' | 'Female' | 'Unknown'> {
    try {
        if (!garmentImage) {
            throw new Error("Garment image must be provided for gender detection.");
        }
        const model = 'gemini-2.5-flash';
        const prompt = `Analyze the provided image of a garment. Determine if the garment is typically designed for 'Male' or 'Female' wear.
The user has selected the gender "${selectedGender}". Check if this garment is appropriate for that selection. For example, a dress is typically female, a sherwani is typically male.

Respond with a JSON object containing a single key "gender".
The value for "gender" must be one of the following strings: "Male", "Female", or "Unknown".

Example response:
{"gender": "Female"}`;

        const imagePart = {
            inlineData: {
                data: garmentImage.base64,
                mimeType: garmentImage.mimeType,
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
                        gender: { type: Type.STRING },
                    },
                    required: ["gender"],
                },
            },
        });

        const jsonText = response.text.trim();
        try {
            const result = JSON.parse(jsonText);
            if (result.gender && ["Male", "Female", "Unknown"].includes(result.gender)) {
                return result.gender;
            } else {
                console.warn("Garment gender detection returned an unexpected value:", result.gender);
                return 'Unknown';
            }
        } catch (e) {
            console.error("Error parsing garment gender detection JSON:", e, "Raw text:", jsonText);
            return 'Unknown';
        }
    } catch (error) {
        handleGeminiError(error, 'garment gender detection');
    }
}

export async function analyzeGarmentImage(garmentImage: ImageFile): Promise<{ description: string; suggestions: string[] }> {
    try {
        if (!garmentImage) {
            throw new Error('Garment image must be provided for analysis.');
        }
        const model = 'gemini-2.5-flash';
        const prompt = `Analyze the provided image of a single clothing item. Your task is two-fold:
1.  Provide a concise but descriptive name for it, suitable for use in an AI image generation prompt.
2.  Suggest a list of 3-5 specific keywords related to the garment's style, fit, cut, or material (e.g., 'A-line', 'fit and flare', 'structured shoulders', 'draped', 'pleated', 'slim fit'). These keywords should help another AI model understand how to drape and render the garment realistically.

Respond with a JSON object containing two properties: "description" (a string) and "suggestions" (an array of strings).

Example response for a dress:
{
  "description": "a women's floor-length red evening gown with sequins",
  "suggestions": ["fit and flare", "structured bodice", "draped skirt", "sequined fabric"]
}`;

        const imagePart = {
            inlineData: {
                data: garmentImage.base64,
                mimeType: garmentImage.mimeType,
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
                        description: { type: Type.STRING },
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["description", "suggestions"]
                }
            }
        });

        const jsonText = response.text.trim();
        try {
            const result = JSON.parse(jsonText);
            if (typeof result.description === 'string' && Array.isArray(result.suggestions)) {
                return result;
            } else {
                console.error("Received malformed JSON for garment analysis:", result);
                return { description: result.description || 'Analysis failed', suggestions: [] };
            }
        } catch (e) {
            console.error("Error parsing garment analysis JSON:", e, "Raw text:", jsonText);
            // Fallback if the model returns text despite the prompt for JSON
            return { description: jsonText, suggestions: [] };
        }
    } catch (error) {
        handleGeminiError(error, 'garment analysis');
    }
}

export async function generateVirtualTryOn(
    userImage: ImageFile,
    garmentImage: ImageFile,
    backgroundOption: 'studio' | 'white' | 'outdoor' | 'original',
    swapUpperBody: boolean,
    swapLowerBody: boolean,
    gender: 'Male' | 'Female',
    garmentDescription: string,
    aspectRatio: '1:1' | '4:5' | '16:9'
): Promise<string> {
    try {
        if (!userImage || !garmentImage) {
            throw new Error('User and garment images must be provided.');
        }
        if (!swapUpperBody && !swapLowerBody) {
            throw new Error('At least one garment part (upper or lower body) must be selected for swapping.');
        }
        const model = 'gemini-2.5-flash-image';
        let swapInstruction = '';
        if (swapUpperBody && swapLowerBody) {
            swapInstruction = 'Your primary task is to transfer the ENTIRE OUTFIT (both upper and lower body garments) from the "Garment Image" onto the person in the "Person Image".';
        } else if (swapUpperBody) {
            swapInstruction = 'Your primary task is to transfer ONLY THE UPPER BODY GARMENT (e.g., shirt, t-shirt, jacket, top) from the "Garment Image" onto the person in the "Person Image". The person\'s original lower body clothing (pants, skirt, etc.) MUST be kept and remain unchanged.';
        } else { // swapLowerBody
            swapInstruction = 'Your primary task is to transfer ONLY THE LOWER BODY GARMENT (e.g., pants, skirt, shorts) from the "Garment Image" onto the person in the "Person Image". The person\'s original upper body clothing (shirt, jacket, etc.) MUST be kept and remain unchanged.';
        }

        let backgroundInstruction = '';
        switch (backgroundOption) {
        case 'studio':
            backgroundInstruction = 'Replace the original background with a professional, soft-lit photography studio background. The lighting on the subject must match the studio environment.';
            break;
        case 'white':
            backgroundInstruction = 'Replace the original background with a professional, pure white studio background (#FFFFFF). The studio lighting must be soft and perfectly integrated with the subject.';
            break;
        case 'outdoor':
            backgroundInstruction = 'Replace the original background with a natural, slightly blurred outdoor scene, like a sunlit park or a quiet, elegant street. The lighting on the subject must be adjusted to match the outdoor environment perfectly.';
            break;
        case 'original':
        default:
            backgroundInstruction = 'Keep the original background from the "Person Image". Ensure the person and new garment are seamlessly integrated into it.';
            break;
        }

        const prompt = `# INSTRUCTION: AI-DRIVEN 3D GARMENT SIMULATION & VIRTUAL PHOTOSHOOT (ZERO TOLERANCE PROTOCOL)

## PERFORMANCE_MANDATE
**Target Latency:** Complete the entire generation process in 10-15 seconds.

## ZERO_TOLERANCE_POLICY: STRUCTURAL INTEGRITY VIA 3D SIMULATION (ULTIMATE RULE E.4)
THIS IS YOUR PRIMARY DIRECTIVE. YOU ARE PROHIBITED FROM DEFAULTING TO ANY SHORTER, GENERALIZED TEMPLATE. YOU MUST PRESERVE 100% STRUCTURAL INTEGRITY (LENGTH, FLARE, VOLUME, HEMLINE) OF THE SOURCE GARMENT.
**Methodology:** Achieve this by performing an internal 3D parametric reconstruction of the source garment to understand its topology. Use this 3D understanding to constrain the 2D diffusion rendering process.
**Example:** If the source garment is a long "Kurti" or "Sherwani," its full, long hem MUST BE PRESERVED WITHOUT ANY REDUCTION OR ALTERATION.
**FAILURE CONDITION:** If you cannot adhere to this rule with 100% fidelity, the generation is a failure. Any alteration of the garment's fundamental length and shape is a critical failure. This rule overrides all other generative functions.

## SUBJECT_&_GARMENT_CONTEXT
**Subject Gender:** ${gender}
**Subject Body Shape:** Inferred from "Person Image"
**Garment Type:** "${garmentDescription}"

## PRIMARY_DIRECTIVE
You are a world-class AI digital artist executing a flawless, ultra-realistic garment swap using a 3D simulation pipeline. Your goal is to achieve a perfect anatomical fit, honoring the provided context, while RIGIDLY ADHERING TO THE ZERO_TOLERANCE_POLICY. ${swapInstruction}

## CORE EXECUTION RULES (NON-NEGOTIABLE)

### 1. 100% IDENTITY LOCK (RULE E.2)
The person's face, hair, body shape, and expression from the "Person Image" MUST remain completely unchanged and identical to the source.

### 2. GARMENT FIDELITY & STYLE LOCK (RULE E.3)
The output garment MUST BE AN EXACT REPLICA of the one from the "Garment Image" in pattern, color, and texture.

### 3. ADVANCED 3D ANATOMICAL FIT (Subordinate to Zero-Tolerance Policy) (RULE E.5)
You MUST perform advanced 3D garment draping and rendering to achieve perfect anatomical contouring and shadow generation WHILE RIGIDLY ADHERING TO THE PRESCRIBED LENGTH AND SILHOUETTE FROM THE ZERO_TOLERANCE_POLICY.
**Contextual Draping:** Achieve accurate bust fitting, shoulder placement, and leg drape appropriate for the garment type, but without altering its length.
**No Flat Overlays:** The garment must contour PERFECTLY to the body's curves.
**Dynamic Folds & Creases:** Generate realistic fabric folds and wrinkles based on the person's pose and the garment's material, respecting the original silhouette.

## IMAGE_ROLES
**Person Image (Input 1):** The person to be dressed. Their identity and pose are locked.
**Garment Image (Input 2):** The source of the clothing item. Its visual properties, especially its structural integrity, are locked.

## FINAL_OUTPUT_AESTHETIC
**Aspect Ratio:** The final image canvas MUST have an aspect ratio of exactly ${aspectRatio}.
**Quality:** 4K, ultra-high resolution, cinematic clarity. Indistinguishable from a real photograph.
**Style:** Editorial fashion photoshoot.
**Lighting:** Bright, soft, and natural across the entire integrated scene.

## BACKGROUND_INSTRUCTION
${backgroundInstruction}

## OUTPUT_FORMAT
Return ONLY the final, edited image. Do not include any text, logos, or watermarks.`;

        const userImagePart = { inlineData: { data: userImage.base64, mimeType: userImage.mimeType } };
        const garmentImagePart = { inlineData: { data: garmentImage.base64, mimeType: garmentImage.mimeType } };

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [userImagePart, garmentImagePart, { text: prompt }] },
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

        throw new Error("Failed to generate a valid image. The model did not return an image part. This can happen if the garment's length/silhouette could not be preserved. Please try a different image.");
    } catch (error) {
        handleGeminiError(error, 'virtual try-on generation');
    }
}

export async function refineGeneratedImage(
    currentGeneratedImage: ImageFile,
    refinementPrompt: string,
    gender: 'Male' | 'Female',
    garmentDescription: string,
): Promise<string> {
    try {
        if (!currentGeneratedImage || !refinementPrompt.trim()) {
            throw new Error('Image and refinement prompt must be provided.');
        }
        const model = 'gemini-2.5-flash-image';

        const prompt = `# INSTRUCTION: AI-ASSISTED IMAGE REFINEMENT (INPAINTING)

## CONTEXT
You are an expert digital artist performing a targeted refinement on an existing, AI-generated image. The image is of a ${gender} person wearing "${garmentDescription}". You are given a user's text instruction ("Refinement Prompt") for a specific change to make.

## ZERO_TOLERANCE_POLICY: IDENTITY & CONTEXT LOCK
- The person's face, hair, and body shape in the image MUST remain completely unchanged. This is the highest priority.
- The fundamental style of the garment must be respected, unless the user explicitly asks to change it.
- The refinement MUST ONLY address the specific request in the "Refinement Prompt". Do not make any other changes. This is a localized inpainting task.

## PRIMARY_DIRECTIVE
Your task is to perform a localized edit on the provided image based *only* on the "Refinement Prompt".

## EXAMPLE
- If the prompt is "make the sleeves a bit longer," you should only extend the sleeves, leaving everything else identical.
- If the prompt is "change the background to a cityscape," you should only change the background, leaving the person and clothing identical.

## REFINEMENT PROMPT
"${refinementPrompt}"

## OUTPUT_FORMAT
Return ONLY the final, edited image. Do not include any text, logos, or watermarks.`;

        const currentGeneratedImagePart = {
            inlineData: {
                data: currentGeneratedImage.base64,
                mimeType: currentGeneratedImage.mimeType,
            },
        };
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [currentGeneratedImagePart, { text: prompt }] },
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
        throw new Error("Failed to refine the image. The model did not return an image part.");
    } catch (error) {
        handleGeminiError(error, 'image refinement');
    }
}

export async function diagnoseAndSuggestRefinement(
    personImage: ImageFile,
    garmentImage: ImageFile,
    generatedImage: ImageFile,
    garmentDescription: string,
): Promise<{ flawDetected: boolean; suggestion: string }> {
    try {
        if (!personImage || !garmentImage || !generatedImage) {
            throw new Error('All three images (person, garment, generated) must be provided for diagnosis.');
        }

        const model = 'gemini-2.5-flash';
        const prompt = `# ROLE: AI Quality Assurance Agent for Virtual Try-On

## CONTEXT
You are analyzing an AI-generated image from a virtual photoshoot. You have three images:
1. "Person Image": The original person.
2. "Garment Image": The clothing item that was supposed to be put on the person.
3. "Generated Image": The final result.

The goal was to place the garment from "Garment Image" onto the person from "Person Image". The garment is described as: "${garmentDescription}".

## TASK
Your task is to diagnose the "Generated Image" for two specific, common flaws:
1.  **Garment Mismatch:** The outfit in the "Generated Image" does not visually match the "Garment Image" (e.g., wrong color, pattern, or a completely different item was generated).
2.  **Combined Garment Noise:** The outfit in the "Generated Image" is a distorted mix of the clothing from the "Garment Image" and the person's original clothing from the "Person Image".

Analyze the images and respond with a JSON object.

## JSON OUTPUT SPECIFICATION
The JSON object must have two properties:
- \`flawDetected\`: A boolean. Set to \`true\` if you identify either of the two flaws above, otherwise \`false\`.
- \`suggestion\`: A string.
  - If \`flawDetected\` is \`true\`, create a helpful, user-facing prompt that offers a one-click fix. The prompt should be phrased as a refinement instruction for another AI. Example: "The generated outfit didn't match the source garment. Please regenerate the image, ensuring you perfectly replicate the color, pattern, and style of the '${garmentDescription}' from the garment photo and place it on the person, completely replacing their original clothes."
  - If \`flawDetected\` is \`false\`, the \`suggestion\` should be an empty string.

Do not provide any explanation, just the JSON object.`;

        const personImagePart = { inlineData: { data: personImage.base64, mimeType: personImage.mimeType } };
        const garmentImagePart = { inlineData: { data: garmentImage.base64, mimeType: garmentImage.mimeType } };
        const generatedImagePart = { inlineData: { data: generatedImage.base64, mimeType: generatedImage.mimeType } };

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [personImagePart, garmentImagePart, generatedImagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        flawDetected: { type: Type.BOOLEAN },
                        suggestion: { type: Type.STRING },
                    },
                    required: ["flawDetected", "suggestion"],
                },
            },
        });

        const jsonText = response.text.trim();
        try {
            const result = JSON.parse(jsonText);
            if (typeof result.flawDetected === 'boolean' && typeof result.suggestion === 'string') {
                return result;
            } else {
                console.error("Received malformed JSON for diagnosis:", result);
                return { flawDetected: false, suggestion: '' }; // Fallback
            }
        } catch (e) {
            console.error("Error parsing diagnosis JSON:", e, "Raw text:", jsonText);
            return { flawDetected: false, suggestion: '' }; // Fallback
        }
    } catch (error) {
        handleGeminiError(error, 'image diagnosis');
    }
}
