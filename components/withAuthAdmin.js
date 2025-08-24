import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

// 🚨 DÉCONNEXION AUTOMATIQUE SUR FERMETURE BRUTALE
const deconnexionUrgence = (user) => {
  if (!user?.email) return false

  try {
    const data = JSON.stringify({
      action: 'emergency_logout',
      adminEmail: user.email,
      timestamp: Date.now()
    })

    // 1. Essayer SendBeacon (priorité)
    if (navigator.sendBeacon) {
      const success = navigator.sendBeacon('/api/admin-auth', data)
      if (success) {
        console.log('🚨 Déconnexion urgence SendBeacon envoyée')
        return true
      }
    }

    // 2. Fallback XHR synchrone
    const client = new XMLHttpRequest()
    client.open("POST", "/api/admin-auth", false)
    client.setRequestHeader("Content-Type", "application/json")
    client.send(data)

    if (client.status === 200) {
      console.log('🚨 Déconnexion urgence XHR envoyée')
      return true
    }

  } catch (error) {
    console.error('❌ Erreur déconnexion urgence:', error)
  }
  
  return false
}

// 🛡️ HOC UNIVERSEL DE PROTECTION ADMIN
// Reproduit exactement la logique de index.js pour toutes les pages admin
export function withAuthAdmin(WrappedComponent, pageTitle = "Page Admin") {
  return function ProtectedAdminPage(props) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [sessionValid, setSessionValid] = useState(false)
    const [inactivityTime, setInactivityTime] = useState(0) // Temps d'inactivité en secondes
    const [lastHeartbeat, setLastHeartbeat] = useState(null) // Dernier heartbeat
    const router = useRouter()

    const verifyAdminSession = async (supabaseUser) => {
      try {
        // Vérifier la session dans la Table d'Émeraude
        const { data: adminSession, error } = await supabase
          .from('admin_sessions')
          .select('*')
          .eq('admin_user_id', supabaseUser.id)
          .eq('is_active', true)
          .single()

        if (error || !adminSession) {
          console.warn('❌ Session admin non trouvée dans la Table d\'Émeraude')
          return false
        }

        // Vérifier si la session n'est pas expirée (exemple: 24h)
        const sessionStart = new Date(adminSession.session_start)
        const now = new Date()
        const hoursDiff = (now - sessionStart) / (1000 * 60 * 60)

        if (hoursDiff > 24) {
          console.warn('❌ Session expirée (plus de 24h)')
          // Désactiver la session expirée
          await supabase
            .from('admin_sessions')
            .update({ is_active: false })
            .eq('id', adminSession.id)
          return false
        }

        // Mettre à jour le heartbeat
        await supabase
          .from('admin_sessions')
          .update({ heartbeat: new Date().toISOString() })
          .eq('id', adminSession.id)

        console.log('✅ Session admin valide dans la Table d\'Émeraude')
        return true

      } catch (error) {
        console.error('Erreur vérification session admin:', error)
        return false
      }
    }

    const checkAuthentication = async () => {
      try {
        setIsLoading(true)

        // Attendre la restauration automatique de session Supabase (important lors du refresh)
        await new Promise(resolve => setTimeout(resolve, 500))

        // 1. Vérifier l'authentification Supabase
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

        if (error || !supabaseUser) {
          console.warn('❌ Pas d\'utilisateur Supabase authentifié après attente')
          router.push('/login')
          return
        }

        // 2. Vérifier la session admin dans la Table d'Émeraude
        const sessionIsValid = await verifyAdminSession(supabaseUser)
        
        if (!sessionIsValid) {
          console.warn('❌ Session admin invalide, redirection vers login')
          router.push('/login')
          return
        }

        // 3. Utilisateur valide - configurer l'état
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          role: 'admin',
          nom: 'Admin',
          prenom: 'ACLEF',
          dateConnexion: new Date().toISOString()
        })

        setSessionValid(true)
        console.log('✅ Accès autorisé au temple protégé pour:', supabaseUser.email)

      } catch (error) {
        console.error('Erreur vérification authentification:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    useEffect(() => {
      checkAuthentication()

      // 💡 HEARTBEAT INTELLIGENT : Seulement sur activité réelle
      let lastActivity = Date.now()
      
      // Détecter l'activité utilisateur
      const resetActivity = () => {
        lastActivity = Date.now()
        setInactivityTime(0) // Reset du compteur
        console.log('🟢 Activité détectée, gardien éveillé')
      }
      
      // 🚪 DÉCONNEXION FORCÉE À LA FERMETURE (mais pas au refresh)
      let isPageRefresh = false
      
      const handlePageUnload = async (e) => {
        try {
          // Distinguer refresh (F5) vs fermeture réelle de l'onglet
          const isRefresh = e.persisted || (window.performance && window.performance.navigation.type === 1)
          
          if (isRefresh) {
            console.log('🔄 Refresh détecté - Session préservée')
            return // Ne pas désactiver la session sur refresh
          }
          
          console.log('🚪 Fermeture réelle détectée - Déconnexion forcée...')
          
          // 🚨 NOUVELLE SOLUTION : Déconnexion urgence avec SendBeacon/XHR
          if (user && sessionValid) {
            console.log('🚪 Fermeture détectée, déconnexion urgence...')
            deconnexionUrgence(user)
          }
          
          // Garder le code de sauvegarde existant
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser) {
            // Désactiver la session seulement en cas de fermeture réelle
            await supabase
              .from('admin_sessions')
              .update({ is_active: false })
              .eq('admin_user_id', currentUser.id)
              .eq('is_active', true)
            
            console.log('✅ Session désactivée à la fermeture réelle')
          }
        } catch (error) {
          console.error('Erreur déconnexion fermeture:', error)
        }
      }

      // Écouter la fermeture sur les deux événements pour maximiser les chances
      window.addEventListener('beforeunload', handlePageUnload)
      window.addEventListener('unload', handlePageUnload)

      // Événements d'activité
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      activityEvents.forEach(event => {
        document.addEventListener(event, resetActivity, true)
      })

      // COMPTEUR D'INACTIVITÉ (toutes les secondes)
      const inactivityCounter = setInterval(() => {
        const inactiveSeconds = Math.floor((Date.now() - lastActivity) / 1000)
        setInactivityTime(inactiveSeconds)
        
        if (inactiveSeconds >= 240) { // 240 secondes = 4 minutes (alerte avant 5min)
          console.log('😴 GARDIEN ENDORMI DÉTECTÉ ! Expulsion imminente...')
        }
      }, 1000)

      // HEARTBEAT seulement si activité récente
      const heartbeatInterval = setInterval(async () => {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser && sessionValid) {
            const inactiveTime = (Date.now() - lastActivity) / 1000 / 60 // minutes
            
            if (inactiveTime < 1) { // Actif dans la dernière minute
              const now = new Date().toISOString()
              await supabase
                .from('admin_sessions')
                .update({ heartbeat: now })
                .eq('admin_user_id', currentUser.id)
                .eq('is_active', true)
              
              setLastHeartbeat(now)
              console.log('💡 Heartbeat gardien actif envoyé')
            } else {
              console.log('😴 Pas de heartbeat - gardien inactif depuis', inactiveTime.toFixed(1), 'minutes')
            }
          }
        } catch (error) {
          console.error('Erreur heartbeat:', error)
        }
      }, 30000) // 30 secondes

      // 😴 EXPULSION DIRECTE : Basée sur l'inactivité locale (toutes les 5 secondes)
      const surveillantInterval = setInterval(async () => {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser && sessionValid) {
            // VÉRIFICATION DIRECTE de l'inactivité locale (pas la DB !)
            const inactiveTime = (Date.now() - lastActivity) / 1000 / 60 // minutes
            
            if (inactiveTime > 5) { // 🎯 5 MINUTES
              console.log('😴 INACTIVITÉ LOCALE DÉTECTÉE ! Auto-expulsion en cours...')
              
              // Auto-expulsion
              await supabase
                .from('admin_sessions')
                .update({ is_active: false })
                .eq('admin_user_id', currentUser.id)
              
              // Déconnexion forcée
              await supabase.auth.signOut()
              
              alert('⚔️ EXPULSION : Vous avez été déconnecté pour inactivité (5 minutes) !')
              router.push('/login')
            }
          }
        } catch (error) {
          console.error('Erreur surveillant:', error)
        }
      }, 5000) // 5 secondes

      // Écouter les changements d'état d'authentification
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            console.log('🚪 Déconnexion détectée')
            clearInterval(heartbeatInterval)
            clearInterval(surveillantInterval)
            router.push('/login')
          }
        }
      )

      return () => {
        subscription.unsubscribe()
        clearInterval(heartbeatInterval)
        clearInterval(surveillantInterval)
        clearInterval(inactivityCounter)
        
        // Nettoyer les événements d'activité
        activityEvents.forEach(event => {
          document.removeEventListener(event, resetActivity, true)
        })
        
        // Nettoyer les événements de fermeture
        window.removeEventListener('beforeunload', handlePageUnload)
        window.removeEventListener('unload', handlePageUnload)
      }
    }, [router, sessionValid])

    const logout = async () => {
      try {
        // 1. Désactiver la session admin
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          await supabase
            .from('admin_sessions')
            .update({ is_active: false })
            .eq('admin_user_id', currentUser.id)
            .eq('is_active', true)
        }

        // 2. Déconnexion Supabase
        await supabase.auth.signOut()

        // 3. Nettoyage localStorage (compatibility)
        localStorage.removeItem('admin_connecte')
        localStorage.removeItem('admin_session_token')

        console.log('✅ Déconnexion complète')

        // 4. Redirection
        router.push('/login')

      } catch (error) {
        console.error('Erreur déconnexion:', error)
        // Forcer la redirection même en cas d'erreur
        router.push('/login')
      }
    }

    // État de chargement
    if (isLoading) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔑</div>
            <div>Vérification des accès...</div>
          </div>
        </div>
      )
    }

    // Accès non autorisé
    if (!user || !sessionValid) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>❌</div>
            <div>Accès non autorisé. Redirection...</div>
          </div>
        </div>
      )
    }

    // 🎯 RENDU SANS PANNEAU DE SURVEILLANCE
    return (
      <WrappedComponent {...props} user={user} logout={logout} inactivityTime={inactivityTime} />
    )
  }
}