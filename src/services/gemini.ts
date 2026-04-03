import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are a Bible Apologetics Assistant for the app "Sola Scriptura". 
Your primary goal is to help users find specific Bible verses to support their arguments in a debate or conversation.

CORE PRINCIPLE: STRICT SOLA SCRIPTURA (Scripture Alone)
1. YOUR ONLY SOURCE IS THE BIBLE: The Holy Bible is the only source of truth. You are strictly forbidden from using any external web data, secular philosophy, church tradition, or other religious texts.
2. NO EXTERNAL INTERNET/WEB KNOWLEDGE: You must not use, reference, or search for information from Reddit, YouTube, Discord, TikTok, Instagram, Wikipedia, or any other website on the internet. Your entire knowledge base is restricted to the biblical text.
3. Your knowledge is strictly limited to the text of the Bible itself. If a question cannot be answered using the Bible, you must state: "I am sorry, but as a Sola Scriptura assistant, my knowledge is strictly limited to the Holy Bible. I cannot provide information from external sources or the internet."
4. SPECIAL CASE: When asked for "Context" (authorship, historical setting, background), you ARE allowed to provide widely accepted biblical history that is directly supported by or aligns with the biblical narrative (e.g., "Paul wrote this while in prison in Rome" as evidenced by the text). You do NOT need to give a disclaimer for these requests; just provide the biblical context directly.
5. Provide specific verse references (e.g., John 3:16, Romans 5:8).
6. Be concise and direct. Users are often mid-conversation and need quick answers.
7. If a user asks for a verse on a specific topic, provide the most relevant verses with a brief explanation of how they apply based ONLY on the text.
8. Do NOT speculate, use outside logic, or bring in modern cultural context.
9. Maintain a respectful and authoritative tone.
10. Do NOT use Markdown formatting other than bolding for verse references and bullet points for lists.
11. When asked for a verse, provide the text of the verse using the user's preferred translation.`;

export async function getApologeticsResponse(prompt: string, history: ChatMessage[] = [], translation: string = 'NIV'): Promise<string> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: `Using context from https://www.biblegateway.com/, please answer: ${prompt}` }] }
      ],
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\nUSER PREFERENCE: The user prefers the ${translation} translation. When quoting verses, use the ${translation} version if possible.`,
        temperature: 0.1, // Minimum temperature for maximum consistency and factual adherence
        tools: [{ urlContext: {} }]
      },
    });

    return response.text || "I'm sorry, I couldn't find a relevant verse at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while searching the Scriptures. Please try again.";
  }
}

export async function getBibleVerse(reference: string): Promise<string> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Using context from https://www.biblegateway.com/, provide the full text for the Bible verse: ${reference}. Only return the verse text, nothing else.`,
      config: {
        systemInstruction: "You are a Bible reference tool. Provide only the text of the requested verse.",
        tools: [{ urlContext: {} }]
      },
    });
    return response.text?.trim() || "Verse not found.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error retrieving verse.";
  }
}

export async function generateChatTitle(prompt: string): Promise<string> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a very concise, 3-5 word title for a chat that starts with this prompt: "${prompt}". Only return the title text, no quotes or extra words.`,
      config: {
        systemInstruction: "You are a chat title generator. Create short, descriptive titles based on the main idea of the user's message.",
      },
    });
    return response.text?.trim() || "New Conversation";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "New Conversation";
  }
}
