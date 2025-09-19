import { NextResponse } from 'next/server'

// Map pour stocker les tentatives par IP
const requestCounts = new Map()

function rateLimitExceeded(ip) {
  const now = Date.now()
  const windowStart = now - 3600000 // 1 heure (plus généreux)
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, [])
  }
  
  const requests = requestCounts.get(ip)
  
  // Nettoyer les anciennes requêtes
  const recentRequests = requests.filter(time => time > windowStart)
  requestCounts.set(ip, recentRequests)
  
  // Ajouter la requête actuelle
  recentRequests.push(now)
  
  // Limiter à 1000 requêtes par heure (très généreux pour usage normal)
  return recentRequests.length > 1000
}

export function middleware(request) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  
  if (rateLimitExceeded(ip)) {
    return new Response('Too Many Requests - Limite de 1000 requêtes par heure dépassée', { 
      status: 429,
      headers: {
        'Retry-After': '3600'
      }
    })
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}