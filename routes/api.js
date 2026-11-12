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

// ── 3. TikTok Video (JSON) ─────
router.get('/tiktok', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a TikTok URL' });
    const config = { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 };
    const apiRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, config);
    const result = apiRes.data;
    if (result.code !== 0 || !result.data) return res.status(404).json({ error: 'TikTok video not found.' });
    res.json({ success: true, title: result.data.title || 'TikTok Video', author: result.data.author?.nickname || 'Unknown', video_url: result.data.play });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching TikTok' });
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

// ── 6. Translate ─────
router.get('/translate', requireApiKey, async (req, res) => {
  try {
    const { text, to, from } = req.query;
    if (!text || !to) return res.status(400).json({ error: 'Please provide text and a target language' });
    const result = await translate(text, { to: to, from: from || 'auto' });
    res.json({ success: true, original: text, translated: result.text, from: result.from.language.iso, to: to });
  } catch (err) {
    res.status(500).json({ error: 'Server error during translation' });
  }
});

// ── 7. Sticker Maker (Image to WebP) ─────
router.post('/sticker', requireApiKey, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please upload an image file' });
    const stickerBuffer = await sharp(req.file.buffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toBuffer();
    res.header('Content-Type', 'image/webp');
    res.send(stickerBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Error processing image to sticker' });
  }
});

// ── 8. QR Generator ─────
router.get('/qr', requireApiKey, async (req, res) => {
  try {
    const { text } = req.query;
    if (!text) return res.status(400).json({ error: 'Please provide text to generate QR' });
    const qrBuffer = await QRCode.toBuffer(text, {
      type: 'png', width: 512, margin: 2, color: { dark: '#08080c', light: '#ffffff' }
    });
    res.header('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Error generating QR code' });
  }
});

// ── 9. Text to Speech (TTS) ─────
router.get('/tts', requireApiKey, async (req, res) => {
  try {
    const { text, lang } = req.query;
    if (!text) return res.status(400).json({ error: 'Please provide text for TTS' });
    const targetLang = lang || 'en';
    const base64Data = await googleTTS.getAllAudioBase64(text, {
      lang: targetLang, slow: false, host: 'https://translate.google.com',
    });
    if (!base64Data || base64Data.length === 0) throw new Error("Failed TTS");
    const finalBuffer = Buffer.concat(base64Data.map(item => Buffer.from(item.base64, 'base64')));
    res.header('Content-Type', 'audio/mpeg');
    res.send(finalBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Error generating TTS' });
  }
});

// ── 10. AI Image Generator ─────
router.get('/ai-image', requireApiKey, async (req, res) => {
  try {
    const { prompt } = req.query;
    if (!prompt) return res.status(400).json({ error: 'Please provide a prompt for the AI' });
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 60000 });
    if (!response.data || response.data.length === 0) throw new Error('Empty image received');
    res.header('Content-Type', 'image/jpeg');
    res.send(Buffer.from(response.data));
  } catch (err) {
    res.status(500).json({ error: 'Error generating AI image' });
  }
});

// ── 11. MediaFire Downloader ─────
router.get('/mediafire', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a MediaFire URL' });
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }, timeout: 15000
    });
    const html = response.data;
    let directLink = null;
    const match = html.match(/href="(https:\/\/download[0-9]+\.mediafire\.com\/[^"]+)"/);
    if (match && match[1]) directLink = match[1];
    else {
      const btnMatch = html.match(/id="downloadButton"[^>]*href="(https:\/\/[^"]+)"/);
      if (btnMatch && btnMatch[1]) directLink = btnMatch[1];
    }
    if (!directLink) return res.status(404).json({ error: 'Could not find direct download link.' });
    const fileName = directLink.split('/').pop().split('?')[0].replace(/%20/g, ' ') || 'mediafire_file';
    const fileRes = await axios({
      method: 'get', url: directLink, responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url }
    });
    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.header('Content-Type', fileRes.headers['content-type'] || 'application/octet-stream');
    fileRes.data.pipe(res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching file from MediaFire' });
  }
});

// ── 12. APK Downloader (Aptoide API) ─────
router.get('/apk', requireApiKey, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Please provide an app name' });
    const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(q)}/limit=1`;
    const { data } = await axios.get(apiUrl, { timeout: 15000 });
    if (!data.datalist || !data.datalist.list || !data.datalist.list.length) {
      return res.status(404).json({ error: 'App not found.' });
    }
    const app = data.datalist.list[0];
    const sizeMB = (app.size / (1024 * 1024)).toFixed(2);
    res.json({ success: true, title: app.name, package: app.package, size: `${sizeMB} MB`, url: app.file.path_alt, icon: app.icon });
  } catch (err) {
    console.error('[APK API Error]', err.message);
    res.status(500).json({ error: 'Server error while fetching APK' });
  }
});

// ── 13. NPM Package Info & Versions ─────
router.get('/npm', requireApiKey, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Please provide a package name' });

    // NPM Registry API එකට රික්වෙස්ට් එක යවනවා
    const { data } = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(q)}`, { timeout: 15000 });

    if (!data) return res.status(404).json({ error: 'Package not found.' });

    // අලුත්ම version එක සහ විස්තර
    const latestVersion = data['dist-tags']?.latest || 'N/A';
    const description = data.description || 'No description available';
    const author = typeof data.author === 'object' ? data.author.name : (data.author || 'Unknown');

    // Versions ලිස්ට් එක අරගෙන අලුත්ම ඒවා 10ක් විතර ගන්නවා
    const allVersions = Object.keys(data.versions || {});
    const recentVersions = allVersions.slice(-10).reverse(); // අලුත්ම ඒවා මුලට එන විදියට

    res.json({
      success: true,
      name: data.name,
      description: description,
      author: author,
      latest: latestVersion,
      versions: recentVersions,
      totalVersions: allVersions.length
    });

  } catch (err) {
    console.error('[NPM API Error]', err.message);
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'Package not found.' });
    }
    res.status(500).json({ error: 'Server error while fetching NPM package info' });
  }
});

module.exports = router;
