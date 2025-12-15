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

  try {
    // STRICT MVP RULE: Only inline uploads allowed to avoid deployed CORS issues.
    // The UI limits files to 20MB. 
    // Technically, Base64 adds ~33% size. 
    // 20MB file -> 26MB Base64.
    // Google API limit is 20MB for payload. 
    // So strictly speaking, files > ~15MB might still error with "413 Payload Too Large" from the API.
    // However, removing the File API upload logic prevents the application from hanging/crashing with 404s.
    
    if (file.size > 22 * 1024 * 1024) {
         // Fail fast if somehow a huge file got here
         throw new Error("File is too large for inline processing. Please use a file smaller than 20MB.");
    }

    onProgress(AnalysisState.UPLOADING);
    console.log("Processing file inline...");
    const videoPart = await fileToGenerativePart(file);
    
    // Switch to analyzing state
    onProgress(AnalysisState.ANALYZING);

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