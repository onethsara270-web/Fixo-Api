const express = require('express');
const router = express.Router();
const axios = require('axios');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const QRCode = require('qrcode');
const googleTTS = require('google-tts-api');
const { translate } = require('google-translate-api-x');
const { requireApiKey } = require('../middleware/apiAuth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function getCookieFile(envVar, fileName) {
  if (!process.env[envVar]) return null;
  const filePath = `/tmp/${fileName}`;
  try { fs.writeFileSync(filePath, process.env[envVar]); return filePath; } 
  catch (err) { return null; }
}

// ── 1. YouTube Song ─────
router.get('/song', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });
    const cookieFile = getCookieFile('YOUTUBE_COOKIES', 'yt_cookies.txt');
    const options = { format: 'bestaudio', output: '-', noWarnings: true, noCallHome: true, noCheckCertificate: true, youtubeSkipDashManifest: true, jsRuntimes: 'node' };
    if (cookieFile) options.cookies = cookieFile;
    const subprocess = youtubedl.exec(url, options);
    res.header('Content-Type', 'audio/mpeg');
    res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
    subprocess.stdout.pipe(res);
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: 'Error' }); }
});

// ── 2. YouTube Video ─────
router.get('/video', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });
    const cookieFile = getCookieFile('YOUTUBE_COOKIES', 'yt_cookies.txt');
    const options = { format: 'best[ext=mp4]', output: '-', noWarnings: true, noCallHome: true, noCheckCertificate: true, youtubeSkipDashManifest: true, jsRuntimes: 'node' };
    if (cookieFile) options.cookies = cookieFile;
    const subprocess = youtubedl.exec(url, options);
    res.header('Content-Type', 'video/mp4');
    res.header('Content-Disposition', 'attachment; filename="video.mp4"');
    subprocess.stdout.pipe(res);
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: 'Error' }); }
});

// ── 3. TikTok Video (Bulletproof 3-API Fallback) ─────
router.get('/tiktok', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a TikTok URL' });

    let videoUrl = null, title = 'TikTok Video', author = 'Unknown';

    // API 1: tikwm
    try {
      const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (data?.code === 0 && data?.data?.play) { videoUrl = data.data.play; title = data.data.title; author = data.data.author?.nickname; }
    } catch (e) { console.log('TikWM failed'); }

    // API 2: vreden
    if (!videoUrl) {
      try {
        const { data } = await axios.get(`https://api.vreden.my.id/api/tiktok?url=${encodeURIComponent(url)}`, { timeout: 10000 });
        if (data?.status && data?.result?.video) { videoUrl = data.result.video; title = data.result.title; author = data.result.author; }
      } catch (e) { console.log('Vreden failed'); }
    }

    // API 3: siputzx
    if (!videoUrl) {
      try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`, { timeout: 10000 });
        if (data?.status && data?.data?.url) { videoUrl = data.data.url; title = data.data.title; author = data.data.author; }
      } catch (e) { console.log('Siputzx failed'); }
    }

    if (!videoUrl) return res.status(200).json({ success: false, error: 'All TikTok APIs failed. Link might be private.' });

    res.json({ success: true, title, author, video_url: videoUrl });
  } catch (err) { res.status(200).json({ success: false, error: 'Server error' }); }
});

// ── 4. Instagram ─────
router.get('/instagram', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Provide IG URL' });
    const cookieFile = getCookieFile('INSTAGRAM_COOKIES', 'ig_cookies.txt');
    const options = { output: '-', noWarnings: true, noCallHome: true, format: 'best', addHeader: ['referer:instagram.com', 'user-agent:Mozilla/5.0'] };
    if (cookieFile) options.cookies = cookieFile;
    const subprocess = youtubedl.exec(url, options);
    res.header('Content-Type', 'video/mp4');
    subprocess.stdout.pipe(res);
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: 'Error' }); }
});

// ── 5. Facebook ─────
router.get('/facebook', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Provide FB URL' });
    const cookieFile = getCookieFile('FACEBOOK_COOKIES', 'fb_cookies.txt');
    const options = { output: '-', noWarnings: true, noCallHome: true, format: 'best[ext=mp4]/best', addHeader: ['referer:facebook.com', 'user-agent:Mozilla/5.0'] };
    if (cookieFile) options.cookies = cookieFile;
    const subprocess = youtubedl.exec(url, options);
    res.header('Content-Type', 'video/mp4');
    subprocess.stdout.pipe(res);
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: 'Error' }); }
});

// ── 6-15. අනිත් ඔක්කොම (කලින් වගේමයි) ─────
router.get('/translate', requireApiKey, async (req, res) => {
  try { const result = await translate(req.query.text, { to: req.query.to, from: req.query.from || 'auto' }); res.json({ success: true, translated: result.text }); } catch (err) { res.status(500).json({ error: 'Error' }); }
});
router.post('/sticker', requireApiKey, upload.single('image'), async (req, res) => {
  try { const buffer = await sharp(req.file.buffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toBuffer(); res.header('Content-Type', 'image/webp'); res.send(buffer); } catch (err) { res.status(500).json({ error: 'Error' }); }
});
router.get('/qr', requireApiKey, async (req, res) => {
  try { const buffer = await QRCode.toBuffer(req.query.text, { type: 'png', width: 512 }); res.header('Content-Type', 'image/png'); res.send(buffer); } catch (err) { res.status(500).json({ error: 'Error' }); }
});
router.get('/tts', requireApiKey, async (req, res) => {
  try { const data = await googleTTS.getAllAudioBase64(req.query.text, { lang: req.query.lang || 'en' }); res.header('Content-Type', 'audio/mpeg'); res.send(Buffer.concat(data.map(i => Buffer.from(i.base64, 'base64')))); } catch (err) { res.status(500).json({ error: 'Error' }); }
});
router.get('/ai-image', requireApiKey, async (req, res) => {
  try { const img = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(req.query.prompt)}?width=1024&height=1024&nologo=true`, { responseType: 'arraybuffer' }); res.header('Content-Type', 'image/jpeg'); res.send(Buffer.from(img.data)); } catch (err) { res.status(500).json({ error: 'Error' }); }
});
router.get('/apk', requireApiKey, async (req, res) => {
  try { const { data } = await axios.get(`http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(req.query.q)}/limit=1`); const app = data.datalist.list[0]; res.json({ success: true, title: app.name, url: app.file.path_alt }); } catch (err) { res.status(500).json({ error: 'Error' }); }
});
router.get('/mediafire', requireApiKey, async (req, res) => {
  try { const { data } = await axios.get(req.query.url); const match = data.match(/href="(https:\/\/download[0-9]+\.mediafire\.com\/[^"]+)"/); const file = await axios.get(match[1], { responseType: 'stream' }); res.header('Content-Type', 'application/octet-stream'); file.data.pipe(res); } catch (err) { res.status(500).json({ error: 'Error' }); }
});
router.get('/npm', requireApiKey, async (req, res) => {
  try { const { data } = await axios.get(`https://registry.npmjs.org/${req.query.q}`); res.json({ success: true, name: data.name, latest: data['dist-tags'].latest }); } catch (err) { res.status(500).json({ error: 'Error' }); }
});
router.get('/base64', requireApiKey, async (req, res) => {
  try { const { text, action } = req.query; const result = action.startsWith('e') ? Buffer.from(text).toString('base64') : Buffer.from(text, 'base64').toString('utf-8'); res.json({ success: true, result }); } catch (err) { res.status(500).json({ error: 'Error' }); }
});
router.get('/movie', requireApiKey, async (req, res) => {
  try { const { data } = await axios.get(`http://www.omdbapi.com/?apikey=b9a5e69d&t=${req.query.q}`); if (data.Response === 'False') return res.status(404).json({ error: 'Not found' }); res.json({ success: true, title: data.Title, plot: data.Plot, poster: data.Poster }); } catch (err) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
