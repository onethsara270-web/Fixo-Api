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

// ── Multer Setup (Memory Storage) ─────
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Max 5MB
});

// ── Helper: Write Cookies ─────
function getCookieFile(envVar, fileName) {
  if (!process.env[envVar]) return null;
  const filePath = `/tmp/${fileName}`;
  try {
    fs.writeFileSync(filePath, process.env[envVar]);
    return filePath;
  } catch (err) {
    return null;
  }
}

// ── 1. YouTube Song (MP3 Stream) ─────
router.get('/song', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });
    const cookieFile = getCookieFile('YOUTUBE_COOKIES', 'yt_cookies.txt');
    const options = {
      format: 'bestaudio', output: '-', noWarnings: true, noCallHome: true,
      noCheckCertificate: true, youtubeSkipDashManifest: true, jsRuntimes: 'node',
    };
    if (cookieFile) options.cookies = cookieFile;
    const subprocess = youtubedl.exec(url, options);
    res.header('Content-Type', 'audio/mpeg');
    res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
    subprocess.stdout.pipe(res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching song' });
  }
});

// ── 2. YouTube Video (MP4 Stream) ─────
router.get('/video', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });
    const cookieFile = getCookieFile('YOUTUBE_COOKIES', 'yt_cookies.txt');
    const options = {
      format: 'best[ext=mp4]', output: '-', noWarnings: true, noCallHome: true,
      noCheckCertificate: true, youtubeSkipDashManifest: true, jsRuntimes: 'node',
    };
    if (cookieFile) options.cookies = cookieFile;
    const subprocess = youtubedl.exec(url, options);
    res.header('Content-Type', 'video/mp4');
    res.header('Content-Disposition', 'attachment; filename="video.mp4"');
    subprocess.stdout.pipe(res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching video' });
  }
});

// ── 3. TikTok Video (JSON Link - yt-dlp + Cookies) ─────
router.get('/tiktok', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a TikTok URL' });

    const cookieFile = getCookieFile('TIKTOK_COOKIES', 'tt_cookies.txt');
    
    const options = {
      dumpSingleJson: true, // ලින්ක් එක විතරක් JSON විදියට ගන්නවා
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      addHeader: [
        'referer:tiktok.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ]
    };

    if (cookieFile) options.cookies = cookieFile;

    // yt-dlp එකෙන් වීඩියෝ එකේ ඩේටා ගන්නවා
    const output = await youtubedl(url, options);
    
    if (!output || !output.url) {
      throw new Error('Failed to extract TikTok video URL');
    }

    // බොට් එකට ඕන කරන විදියට JSON එක එවනවා (පරණ plugin එකට මේක තමයි ඕන)
    res.json({
      success: true,
      title: output.title || 'TikTok Video',
      author: output.uploader || 'Unknown',
      video_url: output.url 
    });

  } catch (err) {
    console.error('[TikTok API Error]', err.message);
    res.status(500).json({ error: 'TikTok blocked the request or video is private.' });
  }
});

// ── 4. Instagram Video (Stream with Cookies) ─────
router.get('/instagram', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide an Instagram URL' });
    const cookieFile = getCookieFile('INSTAGRAM_COOKIES', 'ig_cookies.txt');
    const options = {
      output: '-', noWarnings: true, noCallHome: true, format: 'best',
      addHeader: ['referer:instagram.com', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']
    };
    if (cookieFile) options.cookies = cookieFile;
    const subprocess = youtubedl.exec(url, options);
    res.header('Content-Type', 'video/mp4');
    res.header('Content-Disposition', 'attachment; filename="instagram.mp4"');
    subprocess.stdout.pipe(res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Instagram blocked the request' });
  }
});

// ── 5. Facebook Video (Stream with Cookies) ─────
router.get('/facebook', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a Facebook URL' });
    const cookieFile = getCookieFile('FACEBOOK_COOKIES', 'fb_cookies.txt');
    const options = {
      output: '-', noWarnings: true, noCallHome: true, format: 'best[ext=mp4]/best',
      addHeader: ['referer:facebook.com', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']
    };
    if (cookieFile) options.cookies = cookieFile;
    const subprocess = youtubedl.exec(url, options);
    res.header('Content-Type', 'video/mp4');
    res.header('Content-Disposition', 'attachment; filename="facebook.mp4"');
    subprocess.stdout.pipe(res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Facebook blocked the request.' });
  }
});

// ── ඉතුරු API ටික (කලින් වගේමයි) ─────
router.get('/translate', requireApiKey, async (req, res) => {
  try {
    const { text, to, from } = req.query;
    const result = await translate(text, { to: to || 'en', from: from || 'auto' });
    res.json({ success: true, original: text, translated: result.text, from: result.from.language.iso, to: to });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/sticker', requireApiKey, upload.single('image'), async (req, res) => {
  try {
    const stickerBuffer = await sharp(req.file.buffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toBuffer();
    res.header('Content-Type', 'image/webp'); res.send(stickerBuffer);
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/qr', requireApiKey, async (req, res) => {
  try {
    const qrBuffer = await QRCode.toBuffer(req.query.text, { type: 'png', width: 512, margin: 2 });
    res.header('Content-Type', 'image/png'); res.send(qrBuffer);
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/tts', requireApiKey, async (req, res) => {
  try {
    const base64Data = await googleTTS.getAllAudioBase64(req.query.text, { lang: req.query.lang || 'en', slow: false, host: 'https://translate.google.com' });
    res.header('Content-Type', 'audio/mpeg'); res.send(Buffer.concat(base64Data.map(item => Buffer.from(item.base64, 'base64'))));
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/ai-image', requireApiKey, async (req, res) => {
  try {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(req.query.prompt)}?width=1024&height=1024&nologo=true`;
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 60000 });
    res.header('Content-Type', 'image/jpeg'); res.send(Buffer.from(response.data));
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/apk', requireApiKey, async (req, res) => {
  try {
    const { data } = await axios.get(`http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(req.query.q)}/limit=1`, { timeout: 15000 });
    const app = data.datalist.list[0];
    res.json({ success: true, title: app.name, package: app.package, size: `${(app.size / (1024 * 1024)).toFixed(2)} MB`, url: app.file.path_alt });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/mediafire', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
    const match = response.data.match(/href="(https:\/\/download[0-9]+\.mediafire\.com\/[^"]+)"/);
    if (!match) return res.status(404).json({ error: 'Link not found' });
    const fileRes = await axios({ method: 'get', url: match[1], responseType: 'stream' });
    res.header('Content-Type', fileRes.headers['content-type'] || 'application/octet-stream');
    fileRes.data.pipe(res);
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/npm', requireApiKey, async (req, res) => {
  try {
    const { data } = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(req.query.q)}`, { timeout: 15000 });
    res.json({ success: true, name: data.name, latest: data['dist-tags']?.latest, description: data.description });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/base64', requireApiKey, async (req, res) => {
  try {
    const { text, action } = req.query;
    const result = action.startsWith('e') ? Buffer.from(text).toString('base64') : Buffer.from(text, 'base64').toString('utf-8');
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/movie', requireApiKey, async (req, res) => {
  try {
    const { data } = await axios.get(`http://www.omdbapi.com/?apikey=b9a5e69d&t=${encodeURIComponent(req.query.q)}`, { timeout: 15000 });
    if (data.Response === 'False') return res.status(404).json({ error: 'Movie not found' });
    res.json({ success: true, title: data.Title, year: data.Year, rating: data.imdbRating, plot: data.Plot, poster: data.Poster !== 'N/A' ? data.Poster : null });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
