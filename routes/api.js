const express = require('express');
const router = express.Router();
const axios = require('axios');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const { requireApiKey } = require('../middleware/apiAuth');

// ── Helper: Write Cookies for YouTube ─────
// Render එකේ Env එකේ තියෙන cookies ටික temp ෆයිල් එකකට ලියනවා
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
      output: '-', // කෙලින්ම ස්ට්‍රීම් කරන්න
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
      jsRuntimes: 'node', // JS runtime එක
    };

    if (cookieFile) {
      options.cookies = cookieFile;
    }

    const subprocess = youtubedl.exec(url, options);
    
    // බ්‍රවුසර් එකට හෝ බොට් එකට ෆයිල් එක යවනවා
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
      format: 'best[ext=mp4]', // හොඳම mp4 වීඩියෝ එක
      output: '-',
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
      jsRuntimes: 'node',
    };

    if (cookieFile) {
      options.cookies = cookieFile;
    }

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

    const config = {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000
    };

    const apiRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, config);
    const result = apiRes.data;

    if (result.code !== 0 || !result.data) {
      return res.status(404).json({ error: 'TikTok video not found or private.' });
    }

    const data = result.data;
    
    // WhatsApp Bot එකට ඕන කරන විදියට JSON එක හදනවා
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
    res.status(500).json({ error: 'Server error while fetching TikTok video. Try again.' });
  }
});

module.exports = router;
