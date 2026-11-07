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

// ── 4. Instagram Video Downloader (Direct Scraping - OUR OWN METHOD) ─────
router.get('/instagram', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide an Instagram URL' });

    let directUrl = null;

    // අපේම ක්‍රමය: WhatsApp බොට් කෙනෙක් විදියට Instagram එකට රික්වෙස්ට් එක යවනවා
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'WhatsApp/2.23.20.0', // මේකෙන් බ්ලොක් එක මගහරිනවා
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        timeout: 15000
      });

      const html = response.data;
      
      // HTML එක ඇතුලේ og:video ටැග් එකෙන් ලින්ක් එක ගන්නවා
      const ogVideoMatch = html.match(/<meta property="og:video" content="(.*?)"/);
      if (ogVideoMatch && ogVideoMatch[1]) {
        directUrl = ogVideoMatch[1].replace(/&amp;/g, '&');
      }
    } catch (e) {
      console.error('[IG Scrape Error]', e.message);
    }

    if (!directUrl) {
      return res.status(404).json({ error: 'Video not found. Post might be private or Instagram blocked the request.' });
    }

    res.json({
      success: true,
      video_url: directUrl
    });

  } catch (err) {
    console.error('[Instagram API Error]', err.message);
    res.status(500).json({ error: 'Server error while scraping Instagram.' });
  }
});

module.exports = router;
