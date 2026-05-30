const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const apiKey = 'AQ.Ab8RN6I9TibITW6jsOSvhRs829_dZkx60LFkKyYJsQQKtSTasA';
  console.log('Testing key with gemini-2.5-flash...');
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Hello');
    console.log('Success:', result.response.text());
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

run();
