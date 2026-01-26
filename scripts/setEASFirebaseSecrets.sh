#!/bin/bash
# Script to set Firebase environment variables as EAS secrets
# Reads from .env file and sets them as EAS secrets

echo "=== Setting Firebase Environment Variables as EAS Secrets ==="
echo ""

if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file first (copy from env.example)"
    exit 1
fi

# Check if eas CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ Error: EAS CLI not found!"
    echo "Install it with: npm install -g eas-cli"
    exit 1
fi

# Read .env file and set secrets
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Only process Firebase variables
    if [[ "$key" == EXPO_PUBLIC_FIREBASE_* ]]; then
        # Remove quotes from value if present
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        
        echo "Setting $key..."
        eas secret:create --scope project --name "$key" --value "$value" --force
        
        if [ $? -eq 0 ]; then
            echo "✓ $key set successfully"
        else
            echo "✗ Failed to set $key"
        fi
        echo ""
    fi
done < .env

echo "=== Done ==="
echo ""
echo "Verify secrets with: eas secret:list"
