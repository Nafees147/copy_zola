import { GoogleGenAI, Modality } from "@google/genai";
import { ImageFile } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleGeminiError = (error: any, context: string): never => {
    console.error(`Gemini API Error during ${context}:`, error);
    
    // Check for specific Gemini API error structure or 429 status code.
    if (error.toString().includes('RESOURCE_EXHAUSTED') || error.toString().includes('429')) {
        throw new Error("Quota Exceeded: You have exceeded your API request limit. Please check your plan and billing details, or try again later.");
    }

    const message = error.message || 'An unknown error occurred.';
    throw new Error(`An AI service error occurred during ${context}. Details: ${message}`);
};


export async function generatePoseSwapImage(
    garmentImage: ImageFile,
    modelImage: ImageFile,
    poseImage: ImageFile,
    poseCommand: string,
    fixInstruction?: string
): Promise<string> {
    try {
        if (!garmentImage || !modelImage || !poseImage) {
            throw new Error('All source images (garment, model, pose) must be provided.');
        }
        
        const model = 'gemini-2.5-flash-image';
        
        const prompt = `# ROLE: AI Photoshoot Director

## GOAL
Create a single, photorealistic, 4K image for a fashion campaign.

## CORE COMPONENTS (Inputs)
- **Image 1 (Garment):** The clothing to be worn.
- **Image 2 (Model Identity):** The face, hair, and ethnicity for the person.
- **Image 3 (Pose Reference):** The body pose to replicate.
- **Text Command (Pose Command):** Specific instructions for the pose's style and attitude.

## CRITICAL EXECUTION INSTRUCTIONS

1.  **SYNTHESIZE, DO NOT REPLACE:** You MUST synthesize a new image by combining all components.
    -   **Pose:** The final model's body pose MUST be an EXACT replica of the pose in the "Pose Reference" image.
    -   **Identity:** The final model's face, hair, and ethnicity MUST be an EXACT match to the "Model Identity" image.
    -   **Garment:** The final model MUST be wearing the EXACT garment from the "Garment" image. Preserve its color, pattern, style, and texture. Ensure a realistic 3D drape on the new pose.

2.  **ADHERE TO THE POSE COMMAND:** The mood and details of the final image must follow this specific instruction:
    **Pose Command:** "${poseCommand}"

${fixInstruction ? `
3.  **APPLY THIS CORRECTION:** A previous generation had an error. You MUST apply this fix: "${fixInstruction}"
` : ''}

4.  **AESTHETICS:**
    -   **Background:** Place the final model on a neutral, seamless grey studio background.
    -   **Quality:** The output must be indistinguishable from a real, high-end professional photograph.

## OUTPUT FORMAT
Return ONLY the final, generated image. No text, watermarks, or other artifacts.`;
        
        const garmentImagePart = { inlineData: { data: garmentImage.base64, mimeType: garmentImage.mimeType } };
        const modelImagePart = { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } };
        const poseImagePart = { inlineData: { data: poseImage.base64, mimeType: poseImage.mimeType } };
        
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [garmentImagePart, modelImagePart, poseImagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return part.inlineData.data;
          }
        }
        
        throw new Error("Failed to generate a valid image. The model did not return an image part. This can happen if the inputs are unclear. Please try a different source image or prompt.");
    } catch (error) {
        handleGeminiError(error, 'style scene generation');
    }
}


export async function changeBackgroundImage(
    subjectImage: ImageFile,
    backgroundImage: ImageFile
): Promise<string> {
    try {
        if (!subjectImage || !backgroundImage) {
            throw new Error('Both subject and background images must be provided.');
        }

        const model = 'gemini-2.5-flash-image';

        const prompt = `# TASK: AI Background Replacement

## GOAL
Combine the person from the "Subject Image" with the scene from the "Background Image" to create a single, seamless, and photorealistic image.

## IMAGE ROLES (In order of appearance)
- **Image 1 (Subject Image):** Contains the person to be extracted.
- **Image 2 (Background Image):** The new background.

## INSTRUCTIONS
1.  **Extract the Subject:** Perfectly cut out the person from the "Subject Image".
2.  **Combine Images:** Place the person into the "Background Image".
3.  **Integrate Realistically:**
    - Match the lighting, shadows, and color of the person to the new background.
    - Ensure the final image looks like a real photograph.

## OUTPUT
- The aspect ratio must match the "Background Image".
- Return ONLY the final composite image. No text or watermarks.`;

        const subjectImagePart = { inlineData: { data: subjectImage.base64, mimeType: subjectImage.mimeType } };
        const backgroundImagePart = { inlineData: { data: backgroundImage.base64, mimeType: backgroundImage.mimeType } };

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [subjectImagePart, backgroundImagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }

        throw new Error("Failed to generate the image. The model did not return an image part. This can happen if the subject cannot be clearly identified in the source image.");

    } catch (error) {
        handleGeminiError(error, 'background change');
    }
}