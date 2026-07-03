import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { verifySession } from '@/lib/auth-server';

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const session = await verifySession();
  if ('error' in session) {
    return Response.json({ error: session.error }, { status: session.status });
  }

  try {
    const { messages, dataContext } = await req.json();

    const systemPrompt = `You are a professional Data Analyst for Validata, a clinical trials portal.
You have access to the currently loaded participants and measurements data for the active session.
Your job is to answer questions about this data, and when asked for visual comparisons, use the generateGraph tool to return data that the frontend will render as a chart.
Be concise, accurate, and professional.

Current context data:
${JSON.stringify(dataContext)}`;

    const result = await streamText({
      model: google('models/gemini-2.5-flash'),
      system: systemPrompt,
      messages,
      tools: {
        generateGraph: {
          description: 'Generate a chart/graph to visually compare or display data.',
          parameters: z.object({
            chartType: z.enum(['bar', 'line', 'pie']).describe('The type of chart to render.'),
            title: z.string().describe('The title of the chart.'),
            data: z.array(z.record(z.string(), z.any())).describe('The data array for the chart. Each object represents a data point. Example: [{name: "Participant 1", goniometer: 45, aiModel: 44}]'),
            dataKeys: z.array(z.string()).describe('The keys in the data objects that hold the numeric values to be plotted on the Y-axis. Example: ["goniometer", "aiModel"]'),
            xAxisKey: z.string().describe('The key in the data objects that holds the labels for the X-axis. Example: "name"'),
          }),
          execute: async ({ chartType, title, data, dataKeys, xAxisKey }) => {
            return { chartType, title, data, dataKeys, xAxisKey, status: "Chart generated and sent to user." };
          },
        },
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("AI Chat Route Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
