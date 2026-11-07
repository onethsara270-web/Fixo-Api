const express = require('express');
const router = express.Router();
const axios = require('axios');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const { requireApiKey } = require('../middleware/apiAuth');

// ── Helper: Write Cookies for YouTube ─────
function getCookieFile() {
  if (!process.env.YOUTUBE_COOKIES) return null;
  const filePath = '/tmp/cookies.txt';
  try {
    fs.writeFileSync(filePath, process.env.YOUTUBE_COOKIES);
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

    const cookieFile = getCookieFile();
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
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching song details' });
  }
});

// ── 2. YouTube Video (MP4 Stream) ─────
router.get('/video', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });

    const cookieFile = getCookieFile();
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
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching video details' });
  }
});

// ── 3. TikTok Video Download (JSON) ─────
router.get('/tiktok', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a TikTok URL' });

    const config = { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 };
    const apiRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, config);
    const result = apiRes.data;

    if (result.code !== 0 || !result.data) return res.status(404).json({ error: 'TikTok video not found.' });

    res.json({
      success: true,
      title: result.data.title || 'TikTok Video',
      author: result.data.author?.nickname || 'Unknown',
      video_url: result.data.play
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error while fetching TikTok video.' });
  }
});

// ── 4. Instagram Video Downloader (Direct Scraping) ─────
router.get('/instagram', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide an Instagram URL' });

    // කෙලින්ම Instagram එකට රික්වෙස්ට් එක යවනවා
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000
    });

    const html = response.data;
    let videoUrl = null;

    // HTML එකේ og:video ටැග් එකෙන් ලින්ක් එක ගන්නවා
    const ogVideoMatch = html.match(/<meta property="og:video" content="(.*?)"/);
    if (ogVideoMatch && ogVideoMatch[1]) {
      videoUrl = ogVideoMatch[1].replace(/&amp;/g, '&');
    } 
    
    // ඒක නැත්නම් JSON ඩේටා එක ඇතුලේ video_url හොයනවා
    if (!videoUrl) {
      const jsonMatch = html.match(/"video_url":"(.*?)"/);
      if (jsonMatch && jsonMatch[1]) {
        videoUrl = jsonMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
      }
    }

    if (!videoUrl) {
      return res.status(404).json({ error: 'Video not found. Post might be private or Instagram blocked the request.' });
    }

    res.json({
      success: true,
      video_url: videoUrl
    });

  } catch (err) {
    console.error('[Instagram API Error]', err.message);
    res.status(500).json({ error: 'Server error while scraping Instagram.' });
  }
});

module.exports = router;
