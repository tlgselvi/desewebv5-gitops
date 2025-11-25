#!/usr/bin/env python3
"""
Detailed Google GenAI Test
"""

from google import genai
from google.genai import types
import os
import sys

# Get API key
api_key = os.environ.get("GOOGLE_CLOUD_API_KEY")

if not api_key:
    print("ERROR: GOOGLE_CLOUD_API_KEY not found!")
    print("Set it with: export GOOGLE_CLOUD_API_KEY='your-key'")
    sys.exit(1)

print("=" * 60)
print("Google GenAI Detailed Test")
print("=" * 60)
print()
print(f"API Key: {api_key[:20]}...")
print()

try:
    print("1. Initializing client...")
    client = genai.Client(vertexai=True, api_key=api_key)
    print("   OK: Client initialized")
    print()
    
    print("2. Testing model access...")
    model = "gemini-3-pro-preview"
    print(f"   Model: {model}")
    print()
    
    print("3. Generating content...")
    response = client.models.generate_content(
        model=model,
        contents=[
            types.Content(
                role="user",
                parts=[types.Part.from_text(text="Merhaba! DESE EA Plan finansal asistanı olarak kendini tanıt. Kısa bir tanıtım yap.")]
            )
        ],
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=500,
        )
    )
    
    print("   OK: Response received")
    print()
    
    print("4. Response content:")
    print("-" * 60)
    if hasattr(response, 'text') and response.text:
        print(response.text)
    elif hasattr(response, 'candidates') and response.candidates:
        for candidate in response.candidates:
            if hasattr(candidate, 'content') and candidate.content:
                if hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if hasattr(part, 'text'):
                            print(part.text)
    else:
        print("Response structure:")
        print(response)
    print("-" * 60)
    print()
    
    print("SUCCESS: Test completed successfully!")
    print("=" * 60)
    
except Exception as e:
    print()
    print("ERROR: Test failed!")
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {str(e)}")
    print()
    print("Troubleshooting:")
    print("1. Check if API key is correct")
    print("2. Verify Vertex AI API is enabled")
    print("3. Check if project has billing enabled")
    print("4. Verify API key has necessary permissions")
    sys.exit(1)

