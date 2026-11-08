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
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching song details' });
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

// ── 4. Instagram Video Downloader (Stream with Cookies) ─────
router.get('/instagram', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide an Instagram URL' });

    const cookieFile = getCookieFile('INSTAGRAM_COOKIES', 'ig_cookies.txt');
    const options = {
      output: '-', noWarnings: true, noCallHome: true, format: 'best',
      addHeader: [
        'referer:instagram.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ]
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

// ── 5. Facebook Video Downloader (Stream with Cookies) ─────
router.get('/facebook', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a Facebook URL' });

    const cookieFile = getCookieFile('FACEBOOK_COOKIES', 'fb_cookies.txt');
    const options = {
      output: '-', noWarnings: true, noCallHome: true, format: 'best[ext=mp4]',
      addHeader: [
        'referer:facebook.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ]
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

// ── 6. Pinterest Video Downloader (Smart Fallback) ─────
router.get('/pinterest', requireApiKey, async (req, res) => {
  try {
    let { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a Pinterest URL' });

    // 1. Short Link එකක් නම් (pin.it), ඒක ලොකු ලින්ක් එකට හරවගන්නවා
    if (url.includes('pin.it')) {
      try {
        const resolveRes = await axios.get(url, { timeout: 10000 });
        if (resolveRes.request && resolveRes.request.res && resolveRes.request.res.responseUrl) {
          url = resolveRes.request.res.responseUrl;
        }
      } catch (e) { console.error('Pin.it resolve failed'); }
    }

    let directUrl = null;

    // 2. මුලින්ම විශ්වාසදායක API එකකින් ලින්ක් එක ගන්නවා (yt-dlp ෆේල් වෙන නිසා)
    try {
      const { data } = await axios.get(`https://api.vreden.my.id/api/pinterest?url=${encodeURIComponent(url)}`, { timeout: 15000 });
      if (data?.status && data?.result?.url) directUrl = data.result.url;
    } catch (e) {}

    // 3. ඒක ෆේල් වුනොත් තව API එකක්
    if (!directUrl) {
      try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/d/pinterest?url=${encodeURIComponent(url)}`, { timeout: 15000 });
        if (data?.status && data?.data?.url) directUrl = data.data.url;
      } catch (e) {}
    }

    // 4. ලින්ක් එක හම්බුනා නම් ඒක කෙලින්ම ස්ට්‍රීම් කරනවා
    if (directUrl) {
      const videoRes = await axios({ 
        method: 'get', 
        url: directUrl, 
        responseType: 'stream',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      res.header('Content-Type', 'video/mp4');
      res.header('Content-Disposition', 'attachment; filename="pinterest.mp4"');
      return videoRes.data.pipe(res);
    }

    // 5. අන්තිම උත්සාහය: yt-dlp + cookies
    const cookieFile = getCookieFile('PINTEREST_COOKIES', 'pin_cookies.txt');
    const options = {
      output: '-', noWarnings: true, noCallHome: true, format: 'best[ext=mp4]/best',
      addHeader: [
        'referer:pinterest.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ]
    };
    if (cookieFile) options.cookies = cookieFile;

    const subprocess = youtubedl.exec(url, options);
    res.header('Content-Type', 'video/mp4');
    res.header('Content-Disposition', 'attachment; filename="pinterest.mp4"');
    subprocess.stdout.pipe(res);

  } catch (err) {
    console.error('[Pinterest API Error]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching Pinterest video' });
  }
});

module.exports = router;
