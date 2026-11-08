const express = require('express');
const router = express.Router();
const axios = require('axios');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const { requireApiKey } = require('../middleware/apiAuth');

// ── Helper: Write Cookies to file for yt-dlp ─────
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

// ── Helper: Parse Netscape Cookies to Header String for Axios ─────
function getCookieHeader(envVar) {
  if (!process.env[envVar]) return '';
  const lines = process.env[envVar].split('\n');
  const cookies = [];
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    const parts = line.split('\t');
    if (parts.length >= 7) {
      cookies.push(`${parts[5]}=${parts[6]}`);
    }
  }
  return cookies.join('; ');
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

// ── 6. Pinterest Video Downloader (With Cookies Scraping) ─────
router.get('/pinterest', requireApiKey, async (req, res) => {
  try {
    let { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a Pinterest URL' });

    // 1. Short link එකක් නම් ලොකු ලින්ක් එකට හරවන්න
    if (url.includes('pin.it')) {
      try {
        const resolve = await axios.get(url, { maxRedirects: 5 });
        url = resolve.request.res.responseUrl || url;
      } catch (e) { console.error('Pin.it resolve failed'); }
    }

    // 2. අපේ Cookies ටික Header එකට හදාගන්නවා
    const cookieHeader = getCookieHeader('PINTEREST_COOKIES');
    let directUrl = null;

    // 3. අපේම ක්‍රමය: කෙලින්ම Pinterest එකට රික්වෙස්ට් එක යවනවා (Cookies එක්ක)
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Cookie': cookieHeader // මෙතන තමයි Cookies ටික දාන්නේ
        },
        timeout: 15000
      });

      const html = response.data;
      // og:video ටැග් එකෙන් ලින්ක් එක ගන්නවා
      const ogMatch = html.match(/<meta property="og:video" content="(.*?)"/);
      if (ogMatch && ogMatch[1]) {
        directUrl = ogMatch[1].replace(/&amp;/g, '&');
      } else {
        // ඒක නැත්නම් JSON ඩේටා එකෙන් හොයනවා
        const jsonMatch = html.match(/"url":"(https:\/\/v1\.pinimg\.com\/videos\/.*?\.mp4)"/);
        if (jsonMatch && jsonMatch[1]) directUrl = jsonMatch[1].replace(/\\/g, '');
      }
    } catch (e) {
      console.error('[Pinterest Scrape Error]', e.message);
    }

    // 4. ලින්ක් එක හම්බුනා නම් ස්ට්‍රීම් කරනවා
    if (directUrl) {
      const videoRes = await axios({
        method: 'get', url: directUrl, responseType: 'stream',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.pinterest.com/' }
      });
      res.header('Content-Type', 'video/mp4');
      res.header('Content-Disposition', 'attachment; filename="pinterest.mp4"');
      return videoRes.data.pipe(res);
    }

    // 5. ඒක ෆේල් වුනොත් විතරක් yt-dlp එකට යනවා (Cookies එක්කම)
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
