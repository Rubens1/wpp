const express = require('express');
const fs = require('fs');
const wppconnect = require('@wppconnect-team/wppconnect');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

// Inicializando a API do Google Generative AI
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
    console.error("Erro ao iniciar a conversa com a AI: ", error);
    throw error;
  }
};

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let clientInstance = null; // Armazenar o cliente da sessão

app.post('/check-ai', async (req, res) => {
  try {
    const responseFromAI = await mainGoogle(req.body.texto);

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
    const useAI = req.body.useAI === true;
    let qrCodeResponse;

    if (useAI) {
      const responseFromAI = await mainGoogle(req.body.texto);
      qrCodeResponse = { success: true, message: responseFromAI };
    } else {
      qrCodeResponse = { success: true, message: 'Não está sendo usado AI.' };
    }

    // Cria o cliente do WhatsApp Connect apenas uma vez
    if (!clientInstance) {
      clientInstance = await wppconnect.create({
        session: 'sales', 
        catchQR: async (base64Qr, asciiQR) => {
          console.log(asciiQR);
          
          if (!res.headersSent) {
            qrCodeResponse.qrCode = base64Qr;
            res.status(200).json(qrCodeResponse);
          }
        },
        logQR: false,
      });

      clientInstance.onMessage(async (message) => {
        if (message.fromMe || message.isGroupMsg) {
          return;
        }
        const responseFromAI = await mainGoogle(message.body);
        await clientInstance.sendText(message.from, responseFromAI);
      });
    } else {
      console.log('Sessão já criada.');
      res.status(200).json({ success: true, message: 'Sessão já ativa.' });
    }
  } catch (error) {
    console.error(error);
    
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Falha ao gerar o código QR ou obter resposta da IA.' });
    }
  }
});

app.post('/send-message', async (req, res) => {
  const { to, message } = req.body;

  // Validação básica dos dados
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Número e mensagem são obrigatórios.' });
  }

  try {
    const formattedNumber = formatPhoneNumber(to);

    // Verifica se o cliente está disponível
    if (!clientInstance) {
      return res.status(500).json({ success: false, error: 'Sessão do WhatsApp não iniciada.' });
    }

    // Envia a mensagem usando o cliente existente
    const result = await clientInstance.sendText(formattedNumber, message);

    console.log('Mensagem enviada com sucesso:', result);
    res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso.' });
  } catch (error) {
    console.error('Erro ao enviar a mensagem:', error);
    res.status(500).json({ success: false, error: 'Falha ao enviar a mensagem.' });
  }
});


function formatPhoneNumber(number) {
  return number.replace(/\D/g, ''); // Remove caracteres não numéricos
}

app.get('/conversations', (req, res) => {
  const { body } = req;
  // Implementar a lógica para obter conversas, se necessário
});

app.listen(PORT, () => {
  console.log(`Servidor escutando na porta ${PORT}`);
});
