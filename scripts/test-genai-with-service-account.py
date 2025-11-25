#!/usr/bin/env python3
"""
Google GenAI Test with Service Account
"""

from google import genai
from google.genai import types
from google.oauth2 import service_account
import os
import json

print("=" * 60)
print("Google GenAI Test with Service Account")
print("=" * 60)
print()

# Load service account credentials
credentials_path = "gcp-credentials.json"

if not os.path.exists(credentials_path):
    print(f"ERROR: {credentials_path} not found!")
    exit(1)

print(f"1. Loading credentials from {credentials_path}...")
credentials = service_account.Credentials.from_service_account_file(
    credentials_path,
    scopes=['https://www.googleapis.com/auth/cloud-platform']
)
print("   OK: Credentials loaded")
print()

# Set environment variable for Application Default Credentials
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path

print("2. Initializing GenAI client...")
try:
    # Try with service account
    client = genai.Client(vertexai=True)
    print("   OK: Client initialized with service account")
    print()
    
    print("3. Testing model access...")
    model = "gemini-3-pro-preview"
    print(f"   Model: {model}")
    print()
    
    print("4. Generating content...")
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
    
    print("5. Response:")
    print("-" * 60)
    
    # Try different ways to get text
    text = None
    if hasattr(response, 'text'):
        text = response.text
    elif hasattr(response, 'candidates') and response.candidates:
        for candidate in response.candidates:
            if hasattr(candidate, 'content') and candidate.content:
                if hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if hasattr(part, 'text'):
                            text = part.text
                            break
    
    if text:
        print(text)
    else:
        print("Response object:")
        print(response)
        print()
        print("Response attributes:")
        print(dir(response))
    
    print("-" * 60)
    print()
    print("SUCCESS: Test completed!")
    print("=" * 60)
    
except Exception as e:
    print()
    print("ERROR: Test failed!")
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {str(e)}")
    print()
    import traceback
    traceback.print_exc()
    print()
    print("Troubleshooting:")
    print("1. Check if gcp-credentials.json is valid")
    print("2. Verify service account has Vertex AI User role")
    print("3. Check if Vertex AI API is enabled")
    exit(1)

