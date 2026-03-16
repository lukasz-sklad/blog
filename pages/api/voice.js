import https from 'https';

export default function handler(req, res) {
  const { text } = req.query;
  if (!text) return res.status(400).send('Brak tekstu');

  const remoteUrl = `https://tts.lmk.one/api/tts?text=${encodeURIComponent(text)}`;

  return new Promise((resolve) => {
    https.get(remoteUrl, { rejectUnauthorized: false }, (remoteRes) => {
      // Przekazujemy wszystkie nagłówki z oryginału
      res.writeHead(remoteRes.statusCode || 200, {
        'Content-Type': remoteRes.headers['content-type'] || 'audio/wav',
        'Cache-Control': 'no-store, max-age=0',
        'Connection': 'keep-alive'
      });

      remoteRes.pipe(res);
      remoteRes.on('end', resolve);
      remoteRes.on('error', (err) => {
        console.error('Remote stream error:', err);
        resolve();
      });
    }).on('error', (err) => {
      console.error('HTTPS get error:', err);
      res.status(500).send('Error');
      resolve();
    });
  });
}
