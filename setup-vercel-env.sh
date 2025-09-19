#!/bin/bash

# Configuration des variables d'environnement sur Vercel
echo "🔧 Configuration des variables d'environnement sur Vercel..."

# Variables Supabase
echo "https://mkbchdhbgdynxwfhpxbw.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDk5NiwiZXhwIjoyMDcwNjkwOTk2fQ._8zQliKa7WsYx5PWO-wTMmNWaOkcV_3BpaD7yuPgkBw" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Variables JWT (à obtenir depuis .env.local)
echo "aclef-secret-jwt-access-token-key-2024" | npx vercel env add JWT_ACCESS_TOKEN_SECRET production  
echo "aclef-secret-jwt-refresh-token-key-2024" | npx vercel env add JWT_REFRESH_TOKEN_SECRET production

echo "✅ Variables d'environnement configurées !"