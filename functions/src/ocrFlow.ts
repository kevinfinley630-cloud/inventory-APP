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
      prompt: `Extract line items from this invoice image. 
      Identify the Product Name, Quantity (Qty), and Weight (if applicable).
      Consolidate duplicates if possible. If a quantity is ambiguous, provide your best professional estimate.
      Return the data in the requested strict JSON format.`,
      context: [
        { document: { text: "Invoice Image", media: { url: input.base64Image } } }
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
