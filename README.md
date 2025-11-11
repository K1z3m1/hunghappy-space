# Free OCR API

OCR API ฟรีที่ไม่ใช้ Chrome ใช้ OCR.Space API และ fallback services

## 🚀 Quick Start

```bash
curl -X POST "https://your-app.koyeb.app/translate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "ocr_space",
    "lang": "en",
    "src": "https://example.com/image.jpg"
  }'