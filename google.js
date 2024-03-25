const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI("AIzaSyC-JrHaqiHunKf4EPwLGi_LyjTUAbnguXQ");
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export const mainGoogle = async (texto) => {

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: "assunto",
      },
      {
        role: "model",
        parts: "Olá, certo!",
      },
    ],
    generationConfig: {
      maxOutputTokens: 100,
    },
  });

  const result = await chat.sendMessage(texto);
  const response = await result.response;
  const text = response.text();
  return text;
};

