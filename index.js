const express = require('express');
const fs = require('fs');
const wppconnect = require('@wppconnect-team/wppconnect');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/qrcode', (req, res) => {
  wppconnect
    .create({
      session: 'sessionName',
      catchQR: (base64Qr, asciiQR) => {
        console.log(asciiQR);
        res.status(200).json({ qrCode: base64Qr });
      },
      logQR: false,
    })
    .then((client) => start(client))
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate QR code.' });
    });
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
