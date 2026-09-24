// Twilio voice webhook: returns minimal TwiML to connect the call.
// In production this would be a full IVR / hold / record handler.
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This is a call from PlayBeat CRM.</Say>
  <Dial record="record-from-answer-dual-channel"/>
</Response>`
  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function GET() {
  return POST(new Request('http://localhost'))
}
