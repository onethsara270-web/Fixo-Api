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
      output: '-', noWarnings: true, noCallHome: true, format: 'best[ext=mp4]',
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

// ── 10. Image Search (Robust Fallback) ─────
router.get('/image', requireApiKey, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Please provide a search query' });

    let imageUrls = [];

    // API 1: Pinterest Search (ඉතාම ලස්සන ඉමේජ් එනවා)
    try {
      const { data } = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, { timeout: 10000 });
      if (data?.status && data?.data?.length > 0) {
        imageUrls = data.data.map(item => item.image_url || item.url).filter(Boolean);
      }
    } catch (e) { console.error('Pinterest API failed'); }

    // API 2: Bing Images (Fallback - වෙනස් API එකක්)
    if (imageUrls.length === 0) {
      try {
        const { data } = await axios.get(`https://api.vreden.my.id/api/image?query=${encodeURIComponent(query)}`, { timeout: 10000 });
        if (data?.status && data?.result?.length > 0) {
          imageUrls = data.result;
        }
      } catch (e) { console.error('Vreden API failed'); }
    }

    // API 3: Google Images Scraper (අන්තිම උත්සාහය)
    if (imageUrls.length === 0) {
      const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000
      });
      const html = response.data;
      // .jpg, .jpeg, .png වලින් ඉවර වෙන ලින්ක්ස් විතරක් ගන්නවා
      const regex = /\["(https:\/\/[^"]+\.(?:jpg|jpeg|png))",/g;
      let match;
      while ((match = regex.exec(html)) !== null && imageUrls.length < 10) {
        imageUrls.push(match[1]);
      }
    }

    // Duplicate අයින් කරනවා
    imageUrls = [...new Set(imageUrls)];

    if (imageUrls.length === 0) {
      return res.status(404).json({ error: 'No images found for this query.' });
    }

    res.json({ success: true, query, images: imageUrls });

  } catch (err) {
    console.error('[Image API Error]', err.message);
    res.status(500).json({ error: 'Server error while fetching images' });
  }
});

module.exports = router;
