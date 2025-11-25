#!/usr/bin/env python3
"""
Google GenAI REST API Test (Direct API call)
"""

import os
import requests
import json

api_key = os.environ.get("GOOGLE_CLOUD_API_KEY")

if not api_key:
    print("ERROR: GOOGLE_CLOUD_API_KEY not found!")
    exit(1)

print("=" * 60)
print("Google GenAI REST API Test")
print("=" * 60)
print()

# Test 1: Vertex AI API
print("Test 1: Vertex AI API (us-central1)")
print("-" * 60)

url = f"https://us-central1-aiplatform.googleapis.com/v1/projects/ea-plan-seo-project/locations/us-central1/publishers/google/models/gemini-3-pro-preview:predict"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "instances": [{
        "prompt": "Merhaba! Kısa bir tanıtım yap."
    }],
    "parameters": {
        "temperature": 0.7,
        "maxOutputTokens": 500
    }
}

try:
    response = requests.post(url, headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("SUCCESS: Vertex AI API working!")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"ERROR: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"ERROR: {e}")

print()
print("-" * 60)
print()

# Test 2: Generative Language API
print("Test 2: Generative Language API")
print("-" * 60)

url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent"

headers = {
    "x-goog-api-key": api_key,
    "Content-Type": "application/json"
}

payload = {
    "contents": [{
        "parts": [{
            "text": "Merhaba! DESE EA Plan finansal asistanı olarak kendini tanıt."
        }]
    }],
    "generationConfig": {
        "temperature": 0.7,
        "maxOutputTokens": 500
    }
}

try:
    response = requests.post(url, headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("SUCCESS: Generative Language API working!")
        data = response.json()
        if "candidates" in data and len(data["candidates"]) > 0:
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            print("Response:")
            print(content)
        else:
            print("Response structure:")
            print(json.dumps(data, indent=2))
    else:
        print(f"ERROR: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"ERROR: {e}")

print()
print("=" * 60)

