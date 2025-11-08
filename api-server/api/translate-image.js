const Tesseract = require('tesseract.js');
const sharp = require('sharp');

module.exports = async (req, res) => {
  // ตั้งค่า CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl, targetLang = 'th' } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    // ดาวน์โหลดภาพ
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    // ใช้ Tesseract.js สำหรับ OCR
    const { data: { text } } = await Tesseract.recognize(
      Buffer.from(imageBuffer),
      'eng+tha+jpn',
      { 
        logger: m => console.log(m),
        tessedit_pageseg_mode: '6'
      }
    );

    if (!text.trim()) {
      return res.status(200).json({
        success: true,
        translatedImage: Buffer.from(imageBuffer).toString('base64'),
        translatedText: '',
        message: 'No text found in image'
      });
    }

    // ใช้ Google Translate API ฟรี (ผ่าน CORS proxy)
    const translateResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`);
    const translateData = await translateResponse.json();
    const translatedText = translateData.responseData.translatedText;

    // สร้างภาพใหม่ด้วยข้อความที่แปล
    const image = sharp(Buffer.from(imageBuffer));
    const metadata = await image.metadata();

    // สร้าง SVG สำหรับข้อความที่แปล
    const svgText = `
      <svg width="${metadata.width}" height="${metadata.height}">
        <style>
          .text-bg {
            fill: rgba(255, 255, 255, 0.9);
            stroke: rgba(0, 0, 0, 0.8);
            stroke-width: 2;
          }
          .text-content {
            font-family: Arial, sans-serif;
            font-size: 24px;
            fill: #000000;
            font-weight: bold;
          }
        </style>
        <rect x="50" y="50" width="${metadata.width - 100}" height="60" class="text-bg" rx="10"/>
        <text x="${metadata.width / 2}" y="85" class="text-content" text-anchor="middle">
          ${translatedText}
        </text>
      </svg>
    `;

    const translatedImageBuffer = await image
      .composite([{
        input: Buffer.from(svgText),
        top: 0,
        left: 0,
      }])
      .jpeg({ quality: 80 })
      .toBuffer();

    res.status(200).json({
      success: true,
      translatedImage: translatedImageBuffer.toString('base64'),
      originalText: text,
      translatedText: translatedText
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};