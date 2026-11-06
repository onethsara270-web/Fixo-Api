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
    console.error('Error writing cookies file:', err.message);
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
      format: 'bestaudio',
      output: '-',
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
      jsRuntimes: 'node',
    };
    if (cookieFile) options.cookies = cookieFile;

    const subprocess = youtubedl.exec(url, options);
    
    res.header('Content-Type', 'audio/mpeg');
    res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
    subprocess.stdout.pipe(res);
  } catch (err) {
    console.error('[Song API Error]', err.message);
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
      format: 'best[ext=mp4]',
      output: '-',
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
      jsRuntimes: 'node',
    };
    if (cookieFile) options.cookies = cookieFile;

    const subprocess = youtubedl.exec(url, options);

    res.header('Content-Type', 'video/mp4');
    res.header('Content-Disposition', 'attachment; filename="video.mp4"');
    subprocess.stdout.pipe(res);
  } catch (err) {
    console.error('[Video API Error]', err.message);
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

    if (result.code !== 0 || !result.data) {
      return res.status(404).json({ error: 'TikTok video not found or private.' });
    }

    const data = result.data;
    res.json({
      success: true,
      title: data.title || 'TikTok Video',
      author: data.author?.nickname || 'Unknown',
      video_url: data.play,
      music_url: data.music_info?.play || null,
      thumbnail: data.cover || null
    });

  } catch (err) {
    console.error('TikTok API Error:', err.message);
    res.status(500).json({ error: 'Server error while fetching TikTok video.' });
  }
});

// ── 4. Instagram Video Downloader (JSON) ─────
router.get('/instagram', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide an Instagram URL' });

    let videoUrl = null;
    let title = 'Instagram Video';

    // API 1: Vreden API (ඉතා වේගවත්)
    try {
      const { data } = await axios.get(`https://api.vreden.my.id/api/ig?url=${encodeURIComponent(url)}`, { timeout: 10000 });
      if (data?.status && data?.result) {
        // සමහර වෙලාවට array එකක් එනවා (carousel)
        const resultData = Array.isArray(data.result) ? data.result[0] : data.result;
        videoUrl = resultData.url || resultData.video_url;
      }
    } catch (e) { console.error('IG API 1 Failed'); }

    // API 2: Siputzx API (Fallback)
    if (!videoUrl) {
      try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/d/ig?url=${encodeURIComponent(url)}`, { timeout: 10000 });
        if (data?.status && data?.data?.length > 0) {
          videoUrl = data.data[0].url; // array එකක් එන නිසා පළවෙනි එක ගන්නවා
        }
      } catch (e) { console.error('IG API 2 Failed'); }
    }

    if (!videoUrl) {
      return res.status(404).json({ error: 'Could not extract video. Post might be private.' });
    }

    res.json({
      success: true,
      title: title,
      author: 'Instagram User',
      video_url: videoUrl
    });

  } catch (err) {
    console.error('Instagram API Error:', err.message);
    res.status(500).json({ error: 'Server error while fetching Instagram video.' });
  }
});

module.exports = router;
