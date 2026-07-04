export async function POST(): Promise<Response> {
  return new Response(JSON.stringify({ error: 'AI chat is not available.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
