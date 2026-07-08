import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const ai = new GoogleGenAI({});

async function test() {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: 'hello world',
      config: { outputDimensionality: 768 }
    });
    console.log('Success:', response.embeddings[0].values.slice(0, 5));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
