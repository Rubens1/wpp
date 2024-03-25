const express = require('express');
const fs = require('fs');
const wppconnect = require('@wppconnect-team/wppconnect');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

    if (useAI) {
      const responseFromAI = await mainGoogle(req.body.texto);
      console.log(responseFromAI);

      wppconnect.create({
        session: 'sessionName',
        catchQR: async (base64Qr, asciiQR) => {
          console.log(asciiQR);
          // Enviar resposta da AI e código QR para o cliente
          res.status(200).json({ success: true, message: responseFromAI, qrCode: base64Qr });
        },
        logQR: false,
      }).then((client) => {
        client.onMessage((message) => {
          console.log('Received message:', message);
          // Verificar se a mensagem recebida deve ser respondida pela AI
          const shouldRespondWithAI = true; // Implemente a lógica necessária para determinar isso
  
          if (shouldRespondWithAI) {
            // Chamar a função mainGoogle para obter a resposta da AI
            mainGoogle(message.body).then((response) => {
              // Enviar a resposta da AI de volta para o remetente
              client.sendText(message.from, response);
            }).catch((error) => {
              console.error("Erro ao responder com AI:", error);
            });
          }
        });
      });
    } else {
      // Se não estiver usando a AI, apenas retorne uma mensagem de sucesso
      wppconnect.create({
        session: 'sessionName',
        catchQR: async (base64Qr, asciiQR) => {
          console.log(asciiQR);
          // Enviar apenas o código QR para o cliente
          res.status(200).json({ success: true, qrCode: base64Qr });
        },
        logQR: false,
      }).then((client) => {
        start(client)
      });
      res.status(200).json({ success: true, message: 'Not using AI.' });
    }
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



function start(client) {
  client.onMessage((message) => {
    console.log('Received message:', message);
    // Você pode adicionar mais lógica aqui conforme necessário
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
