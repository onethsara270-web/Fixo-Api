// All API documentation lives here. Pages and docs auto-update from this.
module.exports = [
  {
    slug: 'song',
    method: 'GET',
    title: 'Song Download',
    tagline: 'High-quality audio from any supported URL.',
    description: 'Extract MP3 audio from YouTube, SoundCloud, and 50+ other sources. Streams return in under 2 seconds for cached content.',
    params: [
      { name: 'url', type: 'string', required: true, example: 'https://youtube.com/watch?v=...' },
      { name: 'quality', type: 'string', required: false, example: '320' }
    ],
    example: `curl -H "X-API-KEY: sk_your_key" \\\n  "https://api.fixo.dev/song?url=https://youtube.com/watch?v=dQw4w9WgXcQ"`,
    status: 'coming_soon'
  },
  {
    slug: 'video',
    method: 'GET',
    title: 'Video Download',
    tagline: 'Any resolution. Any platform.',
    description: 'Download video in 360p, 720p, 1080p, or original quality. Supports YouTube, TikTok, Instagram, Twitter, and 40+ platforms.',
    params: [
      { name: 'url', type: 'string', required: true, example: 'https://tiktok.com/@user/video/...' },
      { name: 'quality', type: 'string', required: false, example: '1080p' }
    ],
    example: `curl -H "X-API-KEY: sk_your_key" \\\n  "https://api.fixo.dev/video?url=https://tiktok.com/@user/video/..."`,
    status: 'coming_soon'
  },
  {
    slug: 'sticker',
    method: 'POST',
    title: 'Sticker Maker',
    tagline: 'Image to WhatsApp sticker in one call.',
    description: 'Convert any image to webp sticker, auto-cropped and resized to 512x512. Works with WhatsApp, Telegram, and Signal.',
    params: [
      { name: 'file', type: 'file', required: true, example: 'image.png' },
      { name: 'pack', type: 'string', required: false, example: 'custom' }
    ],
    example: `curl -X POST -H "X-API-KEY: sk_your_key" \\\n  -F "file=@image.png" \\\n  https://api.fixo.dev/sticker`,
    status: 'coming_soon'
  },
  {
    slug: 'qr',
    method: 'GET',
    title: 'QR Generator',
    tagline: 'Text or URL to scannable QR.',
    description: 'Generate high-contrast QR codes in PNG or SVG. Configurable size, error correction level, and foreground color.',
    params: [
      { name: 'text', type: 'string', required: true, example: 'hello world' },
      { name: 'size', type: 'int', required: false, example: '512' },
      { name: 'format', type: 'string', required: false, example: 'png' }
    ],
    example: `curl -H "X-API-KEY: sk_your_key" \\\n  "https://api.fixo.dev/qr?text=hello&size=512"`,
    status: 'coming_soon'
  },
  {
    slug: 'translate',
    method: 'GET',
    title: 'Translate',
    tagline: '60+ languages, sub-second latency.',
    description: 'Translate text between Sinhala, English, Tamil, and 57 more languages. Auto-detect source language.',
    params: [
      { name: 'text', type: 'string', required: true, example: 'hello' },
      { name: 'to', type: 'string', required: true, example: 'si' },
      { name: 'from', type: 'string', required: false, example: 'auto' }
    ],
    example: `curl -H "X-API-KEY: sk_your_key" \\\n  "https://api.fixo.dev/translate?text=hello&to=si"`,
    status: 'coming_soon'
  },
  {
    slug: 'tts',
    method: 'POST',
    title: 'Text to Speech',
    tagline: 'Natural voices, 40+ languages.',
    description: 'Convert text to natural-sounding audio. Supports Sinhala, English, Tamil, Hindi. Multiple voices per language.',
    params: [
      { name: 'text', type: 'string', required: true, example: 'hello world' },
      { name: 'voice', type: 'string', required: false, example: 'en-US-Aria' }
    ],
    example: `curl -X POST -H "X-API-KEY: sk_your_key" \\\n  -d '{"text":"hello","voice":"en-US-Aria"}' \\\n  https://api.fixo.dev/tts`,
    status: 'coming_soon'
  }
{
  slug: 'tiktok',
  method: 'GET',
  title: 'TikTok Downloader',
  tagline: 'No watermark video downloads.',
  description: 'Download TikTok videos without watermarks directly to your bot. High-speed extraction.',
  params: [
    { name: 'url', type: 'string', required: true, example: 'https://vm.tiktok.com/...' }
  ],
  example: `curl -H "X-API-KEY: fixo_your_key" \\\n  "https://api.fixo.dev/tiktok?url=https://vm.tiktok.com/..."`,
  status: 'live' // මේක 'live' කියලා වෙනස් කළා
    }

];
