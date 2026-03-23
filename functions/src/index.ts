import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { configureGenkit } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';
import { invoiceExtrationFlow } from './ocrFlow';
import { aiTeacherFlow } from './teacherFlow';

admin.initializeApp();

configureGenkit({
  plugins: [
    firebase(),
    googleAI() // requires GEMINI_API_KEY set in environment
  ],
  logLevel: 'info',
  enableTracingAndMetrics: true,
});

export const invoiceOCR = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  return await invoiceExtrationFlow(data);
});

export const askAITeacher = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  return await aiTeacherFlow(data);
});
