#!/usr/bin/env python3
"""
Google GenAI Python SDK Test Script
DESE EA Plan v7.0 - GenAI App Builder Test
"""

from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def generate():
    """Generate content using Google GenAI SDK"""
    
    # Get API key from environment
    api_key = os.environ.get("GOOGLE_CLOUD_API_KEY")
    
    if not api_key:
        print("❌ Error: GOOGLE_CLOUD_API_KEY environment variable not set!")
        print("   Please set it in .env file or export it:")
        print("   export GOOGLE_CLOUD_API_KEY='your-api-key'")
        return
    
    print("🚀 Initializing GenAI client...")
    client = genai.Client(
        vertexai=True,
        api_key=api_key,
    )
    
    model = "gemini-3-pro-preview"
    
    # Full prompt from AGENT_BUILDER_PROMPT.txt
    prompt = """DESE EA Plan için production-ready finansal yönetim ve muhasebe asistanı agent'ı oluştur.

**Agent Özellikleri:**

1. **Finansal Analiz (FinBot):**
   - Gelir-gider analizi ve raporlama
   - Finansal tahminler ve projeksiyonlar
   - Trend analizi ve karşılaştırmalı raporlar
   - Nakit akışı analizi
   - Bütçe planlaması ve öneriler
   - Yatırım değerlendirmeleri

2. **Muhasebe Yönetimi (MuBot):**
   - İşlem kayıtlarını kategorize etme
   - Muhasebe kayıtlarını doğrulama
   - Dönemsel raporlar (aylık/yıllık)
   - Banka mutabakatı desteği
   - Vergi uyumluluğu kontrolü
   - Nakit akışı takibi

3. **Kullanıcı Etkileşimi:**
   - Türkçe doğal dil işleme
   - Soru-cevap formatında çalışma
   - Anlaşılır ve profesyonel açıklamalar
   - Finansal terimleri Türkçe açıklama
   - Örneklerle destekleme
   - Adım adım rehberlik

**Teknik Gereksinimler:**
- Dil: Türkçe (tr)
- Zaman dilimi: Europe/Istanbul
- Veri formatı: JSON
- Güvenlik: KVKK uyumlu
- Veri güvenliği: Şifreleme ve erişim kontrolü
- Multi-turn conversation desteği

**Agent Adı:** DESE Finansal Yönetim Asistanı
**Hedef Kullanıcılar:** KOBİ'ler, muhasebe departmanları, finansal danışmanlar"""
    
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt)
            ]
        ),
    ]
    
    tools = [
        types.Tool(google_search=types.GoogleSearch()),
    ]
    
    generate_content_config = types.GenerateContentConfig(
        temperature=1,
        top_p=0.95,
        max_output_tokens=65535,
        safety_settings=[
            types.SafetySetting(
                category="HARM_CATEGORY_HATE_SPEECH",
                threshold="OFF"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold="OFF"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold="OFF"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_HARASSMENT",
                threshold="OFF"
            )
        ],
        tools=tools,
        thinking_config=types.ThinkingConfig(
            thinking_level="HIGH",
        ),
    )
    
    print(f"📝 Generating content with model: {model}")
    print("=" * 60)
    print()
    
    try:
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if not chunk.candidates or not chunk.candidates[0].content or not chunk.candidates[0].content.parts:
                continue
            print(chunk.text, end="", flush=True)
        
        print()
        print()
        print("=" * 60)
        print("✅ Content generation completed!")
        
    except Exception as e:
        print()
        print(f"❌ Error: {e}")
        print()
        print("💡 Troubleshooting:")
        print("   1. Check if GOOGLE_CLOUD_API_KEY is set correctly")
        print("   2. Verify API key has necessary permissions")
        print("   3. Check if Vertex AI API is enabled in your project")

if __name__ == "__main__":
    generate()

