import { defineFlow } from '@genkit-ai/core';
import { gemini15Flash } from '@genkit-ai/googleai';
import { generate } from '@genkit-ai/core';
import * as z from 'zod';

export const aiTeacherFlow = defineFlow(
  {
    name: 'askAITeacher',
    inputSchema: z.object({
      inventoryContext: z.string(),
    }),
    outputSchema: z.object({
      immediateActions: z.array(z.string()),
      stockTrends: z.string(),
      motivationalTip: z.string(),
    })
  },
  async (input: { inventoryContext: string }) => {
    const response = await generate({
      model: gemini15Flash,
      prompt: `You are a high-level AI Inventory Strategist. 
      Analyze the following inventory scan data (provided as JSON) and provide a professional evaluation.
      
      Look for:
      1. Critical stock shortages (near zero).
      2. Overstocking issues.
      3. Items needing immediate rotation or check.
      
      Inventory Data: ${input.inventoryContext}
      
      Return a structured JSON response with:
      - immediateActions: A list of the top 2-3 most urgent tasks.
      - stockTrends: A brief (1-sentence) observation about the overall stock health.
      - motivationalTip: A short, professional tip for the store team.`,
      output: {
        format: 'json',
        schema: z.object({
          immediateActions: z.array(z.string()),
          stockTrends: z.string(),
          motivationalTip: z.string(),
        })
      }
    });

    const result = response.output();
    return result || { 
      immediateActions: ["Check all stock levels"], 
      stockTrends: "Inventory levels appear stable.", 
      motivationalTip: "Consistency is key to a smooth operation." 
    };
  }
);
