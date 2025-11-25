#!/usr/bin/env python3
"""
Simple Google GenAI Test - Quick Start
"""

from google import genai
from google.genai import types
import os

# Get API key from environment or set directly
api_key = os.environ.get("GOOGLE_CLOUD_API_KEY")

if not api_key:
    print("ERROR: GOOGLE_CLOUD_API_KEY not found!")
    print("   Set it with: export GOOGLE_CLOUD_API_KEY='your-key'")
    print("   Or run: .\\scripts\\setup-google-api-key.ps1")
    exit(1)

print("Testing Google GenAI...")
print()

client = genai.Client(vertexai=True, api_key=api_key)

response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents=[
        types.Content(
            role="user",
            parts=[types.Part.from_text(text="Merhaba! DESE EA Plan finansal asistanı olarak kendini tanıt.")]
        )
    ],
    config=types.GenerateContentConfig(
        temperature=0.7,
        max_output_tokens=1000,
    )
)

print("SUCCESS: Response received")
print("=" * 60)
print(response.text)
print("=" * 60)

