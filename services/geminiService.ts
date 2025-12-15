import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, AnalysisState } from "../types";

// Helper to convert file to Base64 (for small files)
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error("Failed to read file"));
        return;
      }
      const base64String = result.split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to poll for file active state
const waitForFileActive = async (ai: GoogleGenAI, fileName: string): Promise<void> => {
  console.log(`Polling for file processing: ${fileName}`);
  // Initial delay
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  let file = await ai.files.get({ name: fileName });
  
  while (file.state === "PROCESSING") {
    console.log("File is processing...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    file = await ai.files.get({ name: fileName });
  }
  
  if (file.state !== "ACTIVE") {
    throw new Error(`File processing failed with state: ${file.state}`);
  }
  console.log("File is active and ready for analysis.");
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    video_meta: {
      type: Type.OBJECT,
      properties: {
        duration: { type: Type.STRING },
        lighting: { type: Type.STRING },
      },
      required: ["duration", "lighting"],
    },
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.STRING },
          severity: { type: Type.INTEGER },
          classification: { type: Type.STRING },
          description: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ["timestamp", "severity", "classification", "description", "confidence"],
      },
    },
    summary: { type: Type.STRING },
  },
  required: ["video_meta", "events", "summary"],
};

export const analyzeVideoContent = async (
  file: File, 
  onProgress: (state: AnalysisState) => void,
  apiKeyOverride?: string
): Promise<AnalysisResult> => {
  // Use the override key (from UI) or fallback to env var
  const apiKey = apiKeyOverride || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please click the Key icon in the top right to configure it.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Using gemini-2.5-flash as it is excellent for video tasks
  const model = "gemini-2.5-flash";

  let videoPart;

  // STRATEGY: 
  // 1. Try inline for files < 50MB (faster, no CORS issues).
  // 2. Try File API for files > 50MB.
  // 3. If File API fails (common in browsers due to CORS), FALLBACK to inline (up to ~500MB).
  const PREFER_INLINE_THRESHOLD = 50 * 1024 * 1024; // 50MB
  const FORCE_INLINE_FALLBACK_LIMIT = 500 * 1024 * 1024; // 500MB (Browser memory limit risk)

  try {
    const isSmallFile = file.size < PREFER_INLINE_THRESHOLD;

    if (isSmallFile) {
      // Small file: Inline Base64
      onProgress(AnalysisState.ANALYZING);
      videoPart = await fileToGenerativePart(file);
    } else {
      // Large file: Attempt File API Upload
      try {
        onProgress(AnalysisState.UPLOADING);
        console.log("Attempting upload via File API...");
        
        const uploadResponse = await ai.files.upload({
          file: file,
          config: { displayName: file.name, mimeType: file.type }
        });

        console.log(`Upload complete: ${uploadResponse.uri}`);
        
        // We must wait for the file to be processed by Google
        await waitForFileActive(ai, uploadResponse.name);

        // Now we can analyze
        onProgress(AnalysisState.ANALYZING);
        
        videoPart = {
          fileData: {
            fileUri: uploadResponse.uri,
            mimeType: uploadResponse.mimeType
          }
        };
      } catch (uploadError: any) {
        console.warn("File API upload failed, attempting inline fallback...", uploadError);
        
        // If upload fails (e.g. CORS), check if we can fallback to inline
        if (file.size < FORCE_INLINE_FALLBACK_LIMIT) {
           console.log("Falling back to inline data strategy.");
           // Reset state to analyzing to show spinner
           onProgress(AnalysisState.ANALYZING);
           videoPart = await fileToGenerativePart(file);
        } else {
           // File is too big for inline fallback
           throw new Error(`File upload failed and file is too large for browser processing (${(file.size/1024/1024).toFixed(0)}MB). Try a smaller file.`);
        }
      }
    }

    const systemInstruction = `
      Role: Senior Security Operations Center (SOC) Analyst
      Objective: Analyze video footage to identify, log, and classify security-relevant events while filtering out environmental noise.
      
      Rules:
      - IGNORE repetitive motion (trees, rain) unless a subject is obscured.
      - IDENTIFY attributes: Clothing color, Vehicle make, Direction.
      - SEVERITY SCORING: 1=Routine, 3=Suspicious, 5=Critical (Weapon/Force).
      - TIMESTAMPS: Precise HH:MM:SS relative to video start.
      - OUTPUT: Strict JSON format.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          videoPart,
          { text: "Analyze this surveillance footage and generate a security report." }
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for factual analysis
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from model");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};