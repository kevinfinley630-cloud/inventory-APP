import { defineFlow } from '@genkit-ai/core';
import { gemini15Flash } from '@genkit-ai/googleai';
import { generate } from '@genkit-ai/core';
import * as z from 'zod';

export const invoiceExtrationFlow = defineFlow(
  {
    name: 'invoiceOCR',
    inputSchema: z.object({
      base64Image: z.string(),
    }),
    outputSchema: z.object({
      items: z.array(z.object({
        name: z.string(),
        qty: z.number(),
        weight: z.number().optional()
      }))
    })
  },
  async (input: { base64Image: string }) => {
    const response = await generate({
      model: gemini15Flash,
      prompt: "Extract the line items from this invoice picture. Pay close attention to the quantities or weights. Return strict JSON following the schema.",
      context: [
        { document: { text: "", media: { url: input.base64Image } } }
      ],
      output: {
        format: 'json',
        schema: z.object({
          items: z.array(z.object({
            name: z.string(),
            qty: z.number(),
            weight: z.number().optional()
          }))
        })
      }
    });

    const parsedData = response.output();
    return parsedData || { items: [] };
  }
);
