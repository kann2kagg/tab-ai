#!/bin/bash
# 构建完整的background.js

cd "$(dirname "$0")"

echo "// ============================================"
echo "// Safari AI Extension - Complete Background Script"
echo "// Auto-generated - Do not edit manually"
echo "// ============================================"
echo ""
echo "console.log('=== Background Script Loading ===');"
echo ""
echo "// Browser API compatibility"
echo "const browser = window.browser || window.chrome || globalThis.chrome;"
echo ""

# Helper functions
echo "// ============================================"
echo "// HELPER FUNCTIONS"
echo "// ============================================"
cat utils/helpers.js | grep -v "^import" | grep -v "^export"

# Storage wrapper
echo ""
echo "// ============================================"
echo "// STORAGE WRAPPER"
echo "// ============================================"
cat utils/storage.js | grep -v "^import" | grep -v "^export" | sed 's/export class Storage/const Storage ='/ | sed 's/class Storage {/{/'

# AI Prompts
echo ""
echo "// ============================================"
echo "// AI PROMPTS"
echo "// ============================================"
cat api/prompts.js | grep -v "^import" | grep -v "^export"

# OpenAI Client
echo ""
echo "// ============================================"
echo "// OPENAI CLIENT"
echo "// ============================================"
cat api/openai-client.js | grep -v "^import" | grep -v "^export"

echo ""
echo "console.log('[Background] Core modules loaded');"
echo ""
echo "console.log('=== Background Script Ready ===');"
