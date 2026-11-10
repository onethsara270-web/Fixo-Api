module.exports = [
  {
    slug: 'song',
    method: 'GET',
    title: 'Song Download',
    tagline: 'High-quality audio from any supported URL.',
    description: 'Extract MP3 audio from YouTube. Streams return fast without saving to the server.',
    params: [
      { name: 'url', type: 'string', required: true, example: 'https://youtube.com/watch?v=...' }
    ],
    example: `curl -H "X-API-KEY: fixo_your_key" \\\n  "https://api.fixo.dev/song?url=https://youtube.com/watch?v=dQw4w9WgXcQ"`,
    status: 'live'
  },
  {
    slug: 'video',
    method: 'GET',
    title: 'Video Download',
    tagline: 'Any resolution. Any platform.',
    description: 'Download YouTube video in high quality. Supports MP4 format directly.',
    params: [
      { name: 'url', type: 'string', required: true, example: 'https://youtube.com/watch?v=...' }
    ],
    example: `curl -H "X-API-KEY: fixo_your_key" \\\n  "https://api.fixo.dev/video?url=https://youtube.com/watch?v=dQw4w9WgXcQ"`,
    status: 'live'
  },
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
    status: 'live'
  },
  {
    slug: 'instagram',
    method: 'GET',
    title: 'Instagram Downloader',
    tagline: 'Reels and video downloads.',
    description: 'Download Instagram Reels and videos securely using your own cookies.',
    params: [
      { name: 'url', type: 'string', required: true, example: 'https://www.instagram.com/reel/...' }
    ],
    example: `curl -H "X-API-KEY: fixo_your_key" \\\n  "https://api.fixo.dev/instagram?url=https://www.instagram.com/reel/..."`,
    status: 'live'
  },
  {
    slug: 'facebook',
    method: 'GET',
    title: 'Facebook Downloader',
    tagline: 'Download Facebook videos and reels.',
    description: 'Download Facebook reels and videos securely using your own cookies.',
    params: [
      { name: 'url', type: 'string', required: true, example: 'https://www.facebook.com/reel/...' }
    ],
    example: `curl -H "X-API-KEY: fixo_your_key" \\\n  "https://api.fixo.dev/facebook?url=https://www.facebook.com/reel/..."`,
    status: 'live'
  },
  {
    slug: 'sticker',
    method: 'POST',
    title: 'Sticker Maker',
    tagline: 'Image to WhatsApp sticker in one call.',
    description: 'Convert any image to webp sticker, auto-cropped and resized to 512x512.',
    params: [
      { name: 'file', type: 'file', required: true, example: 'image.png' }
    ],
    example: `curl -X POST -H "X-API-KEY: fixo_your_key" \\\n  -F "file=@image.png" \\\n  https://api.fixo.dev/sticker`,
    status: 'coming_soon'
  },
  {
    slug: 'qr',
    method: 'GET',
    title: 'QR Generator',
    tagline: 'Text or URL to scannable QR.',
    description: 'Generate high-contrast QR codes in PNG or SVG.',
    params: [
      { name: 'text', type: 'string', required: true, example: 'hello world' }
    ],
    example: `curl -H "X-API-KEY: fixo_your_key" \\\n  "https://api.fixo.dev/qr?text=hello"`,
    status: 'coming_soon'
  },
  {
  slug: 'translate',
  method: 'GET',
  title: 'Translate',
  tagline: '60+ languages, sub-second latency.',
  description: 'Translate text between Sinhala, English, Tamil, and 57 more languages using our own engine.',
  params: [
    { name: 'text', type: 'string', required: true, example: 'hello' },
    { name: 'to', type: 'string', required: true, example: 'si' },
    { name: 'from', type: 'string', required: false, example: 'auto' }
  ],
  example: `curl -H "X-API-KEY: fixo_your_key" \\\n  "https://api.fixo.dev/translate?text=hello&to=si"`,
  status: 'live'
},
  {
    slug: 'tts',
    method: 'POST',
    title: 'Text to Speech',
    tagline: 'Natural voices, 40+ languages.',
    description: 'Convert text to natural-sounding audio.',
    params: [
      { name: 'text', type: 'string', required: true, example: 'hello world' }
    ],
    example: `curl -X POST -H "X-API-KEY: fixo_your_key" \\\n  -d '{"text":"hello"}' \\\n  https://api.fixo.dev/tts`,
    status: 'coming_soon'
  }
];
