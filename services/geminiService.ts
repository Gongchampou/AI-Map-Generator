/// <reference types="node" />
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MindMapNodeData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Recursively ensures that every node in the mind map data structure has a 'children' array.
 */
const normalizeMindMapData = (node: Partial<MindMapNodeData>): void => {
    if (!node.children) {
        node.children = [];
    }
    for (const child of node.children) {
        normalizeMindMapData(child);
    }
};

// Helper function to create a schema with a limited recursive depth.
const createNestedSchema = (depth: number): object => {
    if (depth <= 0) {
        return {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                topic: { type: Type.STRING },
                content: { type: Type.STRING },
            },
            required: ['id', 'topic', 'content']
        };
    }
    
    return {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            topic: { type: Type.STRING },
            content: { type: Type.STRING },
            children: {
                type: Type.ARRAY,
                items: createNestedSchema(depth - 1)
            }
        },
        required: ['id', 'topic', 'content', 'children']
    };
};

const mindMapNodeSchema = createNestedSchema(8);

/**
 * Generates the mind map structure using Gemini 2.0 Flash for deep reasoning.
 */
export const generateMindMapStructure = async (documentText: string): Promise<MindMapNodeData> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key is missing. Please check your .env.local file.");
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Analyze the following text and generate a highly detailed, deeply nested hierarchical mind map structure. 
            
            The goal is to break down complex information into granular nodes, similar to a code dependency graph.
            - The root object is the main subject.
            - 'topic' should be short, like a key.
            - 'content' should be the value or description.
            - Create as many branches as logically necessary to represent the full depth of the content.
            
            Text: """${documentText}"""`,
            config: {
                responseMimeType: "application/json",
                responseSchema: mindMapNodeSchema,
                // thinkingConfig: { thinkingBudget: 2048 } // Note: Re-enable when supported by the model
            },
        });
        
        const jsonText = response.text;
        const parsedData = JSON.parse(jsonText);
        normalizeMindMapData(parsedData);

        return parsedData as MindMapNodeData;
    } catch (error) {
        console.error("Error generating mind map structure:", error);
        throw new Error(`Failed to generate mind map: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Fast responses for node summarization using Gemini 2.5 Flash Lite.
 */
export const generateQuickSummary = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Summarize this strictly in one sentence: ${text}`
        });
        return response.text || "No summary available.";
    } catch (e) {
        console.error("Quick summary failed", e);
        return "Analysis failed.";
    }
};

/**
 * Chat with document using Gemini 3.0 Pro Preview.
 */
export const createChatSession = (documentContext: string) => {
    return ai.chats.create({
        model: 'gemini-2.0-flash',
        config: {
            systemInstruction: `You are an expert AI assistant helping a user understand a document. 
            Here is the context of the document the user is analyzing:
            """${documentContext}"""
            
            Answer questions based on this context. Be concise and professional.`
        }
    });
};

/**
 * Search grounding using Gemini 2.5 Flash and Google Search Tool.
 */
export const performWebSearch = async (query: string) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: query,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        return {
            text: response.text,
            groundingMetadata: response.candidates?.[0]?.groundingMetadata
        };
    } catch (error) {
        console.error("Web search failed:", error);
        throw error;
    }
};

/**
 * Transcribe audio using Gemini 2.5 Flash.
 */
export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: audioBase64 } },
                    { text: "Transcribe this audio exactly." }
                ]
            }
        });
        return response.text || "";
    } catch (error) {
        console.error("Transcription failed:", error);
        throw error;
    }
};

/**
 * Generate speech (TTS) using Gemini 2.5 Flash TTS.
 */
export const generateSpeech = async (text: string): Promise<string | undefined> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
        console.error("TTS failed:", error);
        throw error;
    }
};

/**
 * Get Live API Client
 */
export const getLiveClient = () => {
    return ai.live;
};
