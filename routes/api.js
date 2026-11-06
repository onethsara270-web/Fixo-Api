const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireApiKey } = require('../middleware/apiAuth');

// ── Helper: Try Multiple APIs for YouTube ─────
async function getYouTubeLink(url, type = 'mp3') {
  const apis = type === 'mp3' ? [
    `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
    `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`,
    `https://api.vevioz.com/api/button/mp3/${encodeURIComponent(url)}`,
    `https://api.alyachan.pro/api/ytmp3?url=${encodeURIComponent(url)}&apikey=G7I6X7`
  ] : [
    `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`,
    `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`,
    `https://api.vevioz.com/api/button/mp4/${encodeURIComponent(url)}`,
    `https://api.alyachan.pro/api/ytmp4?url=${encodeURIComponent(url)}&apikey=G7I6X7`
  ];

  for (const api of apis) {
    try {
      const { data } = await axios.get(api, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      // Siputzx format
      if (data?.status && data?.data?.url) {
        return { download_url: data.data.url, title: data.data.title };
      }
      // Vreden format
      if (data?.status && data?.result?.download?.url) {
        return { download_url: data.result.download.url, title: data.result.metadata?.title };
      }
      // Alya format
      if (data?.status && data?.data?.url) {
        return { download_url: data.data.url, title: data.data.title };
      }
      // Vevioz format
      if (data?.success && data?.download_url) {
         return { download_url: data.download_url, title: data.title };
      }
      // Direct URL return
      if (data?.url) {
        return { download_url: data.url, title: 'YouTube Media' };
      }
    } catch (e) {
      console.error(`[${type} API Error] ${api.split('?')[0]} - ${e.message}`);
      continue; // Fail වුනොත් ඊළඟ එකට යනවා
    }
  }
  throw new Error('All APIs failed to extract link');
}

// ── 1. YouTube Song (MP3 JSON) ─────
router.get('/song', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });

    const result = await getYouTubeLink(url, 'mp3');
    res.json({ success: true, title: result.title || 'song', download_url: result.download_url });

  } catch (err) {
    console.error('[Song API]', err.message);
    res.status(500).json({ error: 'Error fetching song details' });
  }
});

// ── 2. YouTube Video (MP4 JSON) ─────
router.get('/video', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });

    const result = await getYouTubeLink(url, 'mp4');
    res.json({ success: true, title: result.title || 'video', download_url: result.download_url });

  } catch (err) {
    console.error('[Video API]', err.message);
    res.status(500).json({ error: 'Error fetching video details' });
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
    res.status(500).json({ error: 'Server error while fetching TikTok video. Try again.' });
  }
});

module.exports = router;
