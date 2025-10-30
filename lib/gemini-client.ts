/**
 * Simplified Gemini API client for text-based chat with function calling
 */

import { GoogleGenAI, Chat, FunctionDeclaration } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}

export interface GeminiClientConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  tools?: FunctionDeclaration[];
  onFunctionCall?: (functionName: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export class GeminiClient {
  private genAI: GoogleGenAI;
  private chat: Chat;
  private model: string;
  private tools?: FunctionDeclaration[];
  private onFunctionCall?: (functionName: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

  constructor(config: GeminiClientConfig) {
    this.genAI = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gemini-2.0-flash-exp';
    this.tools = config.tools;
    this.onFunctionCall = config.onFunctionCall;

    // Create a chat session with system instruction and tools if provided
    this.chat = this.genAI.chats.create({
      model: this.model,
      config: {
        systemInstruction: config.systemInstruction,
        tools: this.tools ? [{ functionDeclarations: this.tools }] : undefined,
        // Force the model to use functions when available
        toolConfig: this.tools ? {
          functionCallingConfig: {
            mode: 'AUTO' // AUTO mode allows model to decide when to call functions
          }
        } : undefined,
      },
    });
  }

  /**
   * Send a message and get a response, handling function calls automatically
   */
  async sendMessage(message: string): Promise<string> {
    try {
      const response = await this.chat.sendMessage({ message });

      // Check if the model wants to call a function
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0 && this.onFunctionCall) {
        console.log('[GeminiClient] Function calls requested:', functionCalls);

        // Execute all function calls and build response parts
        const responseParts = [];

        for (const functionCall of functionCalls) {
          if (functionCall.name) {
            try {
              const result = await this.onFunctionCall(functionCall.name, functionCall.args || {});
              responseParts.push({
                functionResponse: {
                  name: functionCall.name,
                  response: result,
                },
              });
            } catch (error) {
              console.error(`[GeminiClient] Error executing function ${functionCall.name}:`, error);
              responseParts.push({
                functionResponse: {
                  name: functionCall.name,
                  response: { error: String(error) },
                },
              });
            }
          }
        }

        // Send function responses back to the model
        const followUpResponse = await this.chat.sendMessage({
          message: responseParts,
        });

        return followUpResponse.text || '';
      }

      return response.text || '';
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      throw error;
    }
  }

  /**
   * Clear chat history by creating a new chat session
   */
  clearHistory() {
    this.chat = this.genAI.chats.create({
      model: this.model,
      config: {
        tools: this.tools ? [{ functionDeclarations: this.tools }] : undefined,
        toolConfig: this.tools ? {
          functionCallingConfig: {
            mode: 'AUTO'
          }
        } : undefined,
      },
    });
  }

  /**
   * Update system instruction by creating a new chat session
   */
  updateSystemInstruction(instruction: string) {
    this.chat = this.genAI.chats.create({
      model: this.model,
      config: {
        systemInstruction: instruction,
        tools: this.tools ? [{ functionDeclarations: this.tools }] : undefined,
        toolConfig: this.tools ? {
          functionCallingConfig: {
            mode: 'AUTO'
          }
        } : undefined,
      },
    });
  }

  /**
   * Get current chat history
   */
  getHistory() {
    return this.chat.getHistory();
  }
}
