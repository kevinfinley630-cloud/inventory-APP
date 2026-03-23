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
      advice: z.string(),
    })
  },
  async (input: { inventoryContext: string }) => {
    const response = await generate({
      model: gemini15Flash,
      prompt: `You are an AI Inventory Teacher evaluating the current store state. 
      Read the following inventory JSON and return a 1-sentence tip. 
      For example, if items are expiring, flag them. If items are out of stock, flag them.
      Inventory State: ${input.inventoryContext}`,
      output: {
        format: 'json',
        schema: z.object({ advice: z.string() })
      }
    });

    const result = response.output();
    return result || { advice: "System online. Operations optimal." };
  }
);
