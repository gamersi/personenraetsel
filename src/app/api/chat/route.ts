// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://models.inference.ai.azure.com',
    apiKey: process.env.INFERENCE_API_KEY
});

interface RequestBody {
  text: string;
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json() as RequestBody;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Du erhältst ein Rätsel, in dem es um eine spezifische Person geht, die real oder fiktional sein kann. Deine Aufgabe ist es, diese Person eindeutig zu identifizieren und das Rätsel mit einer genauen und prägnanten Antwort zu lösen. Die Antwort soll nur den Namen der Person enthalten und in der Sprache des Rätsels formuliert sein. Wenn du dir unsicher bist, gib den Namen der Person, die deiner Meinung nach am wahrscheinlichsten gemeint ist." },
        { role: "user", content: text }
      ],
    });

    return NextResponse.json({
      response: completion.choices[0].message.content
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request: ' + error },
      { status: 500 }
    );
  }
}