const express = require('express');
const router = express.Router();
const axios = require('axios');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const { requireApiKey } = require('../middleware/apiAuth');

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

// ── 6. Translate (Google & Siputzx Fallback) ─────
router.get('/translate', requireApiKey, async (req, res) => {
  try {
    const { text, to, from } = req.query;
    if (!text || !to) return res.status(400).json({ error: 'Please provide text and a target language (to)' });
    
    const sourceLang = from || 'auto';
    let translatedText = null;

    // ක්‍රමය 1: Google Translate Free Endpoint
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
      const { data } = await axios.get(gUrl, { timeout: 10000 });
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        translatedText = data[0].map(item => item[0]).join('');
      }
    } catch (e) {
      console.error('Google Translate failed, trying Siputzx...');
    }

    // ක්‍රමය 2: Siputzx API (Fallback)
    if (!translatedText) {
      try {
        const sUrl = `https://api.siputzx.my.id/api/tools/translate?text=${encodeURIComponent(text)}&to=${to}`;
        const { data } = await axios.get(sUrl, { timeout: 10000 });
        if (data && data.status && data.data && data.data.result) {
          translatedText = data.data.result;
        }
      } catch (e) {
        console.error('Siputzx Translate failed');
      }
    }

    if (!translatedText || translatedText.includes("INVALID SOURCE LANGUAGE")) {
      return res.status(500).json({ error: 'Translation failed. Please try again.' });
    }

    res.json({
      success: true,
      original: text,
      translated: translatedText,
      from: sourceLang,
      to: to
    });

  } catch (err) {
    console.error('[Translate API Error]', err.message);
    res.status(500).json({ error: 'Server error during translation' });
  }
});

module.exports = router;
