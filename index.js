const express = require('express');
const fs = require('fs');
const wppconnect = require('@wppconnect-team/wppconnect');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const cors = require('cors');

const genAI = new GoogleGenerativeAI("AIzaSyC-JrHaqiHunKf4EPwLGi_LyjTUAbnguXQ");
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const mainGoogle = async (texto) => {
  try {
    const userMessage = { role: "user", parts: [{ text: texto }] };
    const modelResponse = { role: "model", parts: [{ text: "Olá, certo!" }] };
    
    const chat = model.startChat({
      history: [userMessage, modelResponse],
      generationConfig: {
        maxOutputTokens: 100,
      },
    });

    const result = await chat.sendMessage(texto);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("Erro ao iniciar a conversa com a AI:", error);
    throw error;
  }
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/check-ai', async (req, res) => {
  try {
    // Verificar se a AI está conectada e pode enviar mensagens
    const responseFromAI = await mainGoogle(req.body.texto);

    // Se a resposta da AI for recebida com sucesso, enviar uma resposta de sucesso
    if (responseFromAI) {
      console.log('AI está conectada e funcionando.');
      res.status(200).json({ success: true, message: 'AI está conectada e funcionando.' });
    } else {
      console.error('Falha ao receber resposta da AI.');
      res.status(500).json({ success: false, error: 'Falha ao receber resposta da AI.' });
    }
  } catch (error) {
    console.error('Erro ao verificar AI:', error);
    res.status(500).json({ success: false, error: 'Erro ao verificar AI.', detailedError: error });
  }
});

app.post('/qrcode', async (req, res) => {
  try {
      // Verifica se o parâmetro useAI está presente e é verdadeiro
      const useAI = req.body.useAI === true;

      let qrCodeResponse;

      if (useAI) {
          const responseFromAI = await mainGoogle(req.body.texto);

          qrCodeResponse = { success: true, message: responseFromAI };
      } else {
          qrCodeResponse = { success: true, message: 'Not using AI.' };
      }

      wppconnect.create({
          session: 'sales', // sales || support
          catchQR: async (base64Qr, asciiQR) => {
              console.log(asciiQR);
              // Enviar código QR para o cliente
              qrCodeResponse.qrCode = base64Qr;
              res.status(200).json(qrCodeResponse);
          },
          logQR: false,
      }).then((client) => {
          // Se não estiver usando a AI, definir um manipulador vazio de mensagens
          if (!useAI) {
              client.onMessage(() => {});
          }
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Failed to generate QR code or get response from AI.' });
  }
});


app.post('/send-message', (req, res) => {
  const { body } = req;
  const { to, message } = body;

  wppconnect
    .sendText(to, message)
    .then((result) => {
      console.log('Message sent successfully:', result);
      res.status(200).json({ success: true, message: 'Message sent successfully.' });
    })
    .catch((error) => {
      console.error('Error when sending message:', error);
      res.status(500).json({ success: false, error: 'Failed to send message.' });
    });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
