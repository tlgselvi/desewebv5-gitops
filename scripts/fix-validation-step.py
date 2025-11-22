#!/usr/bin/env python3
"""Add validation step to GitHub Actions workflow"""
from pathlib import Path

path = Path('.github/workflows/deploy.yml')

# Read file with UTF-8 encoding
text = path.read_text(encoding='utf-8')

# Pattern to find and replace
old = """      - uses: azure/setup-helm@v3

      - name: 🔐 Configure kubectl"""

# New pattern with validation step
new = """      - uses: azure/setup-helm@v3

      - name: 🛡️ Validate kubeconfig secret
        run: |
          if [ -z "${KUBECONFIG_SECRET}" ]; then
            echo "ERROR: Kubeconfig secret is missing for environment '${{ github.event.inputs.environment }}'."
            echo "Set KUBECONFIG_PRODUCTION or KUBECONFIG_STAGING in GitHub Actions secrets."
            exit 1
          fi
          echo "✅ Kubeconfig secret is set for environment: ${{ github.event.inputs.environment }}"

      - name: 🔐 Configure kubectl"""

# Check if old pattern exists
if old not in text:
    print("Pattern not found in file!")
    print("Looking for pattern around 'azure/setup-helm@v3'...")
    # Show context
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if 'azure/setup-helm@v3' in line:
            start = max(0, i - 2)
            end = min(len(lines), i + 5)
            print("\nContext:")
            for j in range(start, end):
                marker = ">>> " if j == i else "    "
                print(f"{marker}{j+1:4}: {lines[j]}")
    exit(1)

# Replace
text = text.replace(old, new)

# Write back with UTF-8 encoding
path.write_text(text, encoding='utf-8')

print("✅ Validation step added successfully!")

