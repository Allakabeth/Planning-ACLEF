import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import MessagerieSafeWrapper from '../components/MessagerieSafeWrapper'

// Composant Skeleton Loading pour anti-flickering
const SkeletonLoader = () => {
  const shimmer = {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      
      {/* Header Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            height: '28px', 
            width: '300px', 
            borderRadius: '4px', 
            marginBottom: '10px',
            ...shimmer 
          }} />
          <div style={{ 
            height: '16px', 
            width: '200px', 
            borderRadius: '4px',
            ...shimmer 
          }} />
        </div>
        <div style={{ 
          height: '40px', 
          width: '120px', 
          borderRadius: '8px',
          ...shimmer 
        }} />
      </div>

      {/* Main Content Skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '350px 1fr',
        gap: '20px',
        minHeight: 'calc(100vh - 200px)'
      }}>
        
        {/* Left Column Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[1, 2].map(section => (
            <div key={section} style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              flex: 1
            }}>
              <div style={{ 
                height: '20px', 
                width: '120px', 
                borderRadius: '4px', 
                marginBottom: '15px',
                ...shimmer 
              }} />
              {[1, 2, 3, 4].map(item => (
                <div key={item} style={{ 
                  height: '48px', 
                  borderRadius: '8px', 
                  marginBottom: '10px',
                  ...shimmer 
                }} />
              ))}
            </div>
          ))}
        </div>

        {/* Right Column Skeleton (Messagerie) */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          padding: '20px'
        }}>
          <div style={{ 
            height: '20px', 
            width: '150px', 
            borderRadius: '4px', 
            marginBottom: '20px',
            ...shimmer 
          }} />
          <div style={{ 
            height: '300px', 
            borderRadius: '8px', 
            marginBottom: '15px',
            ...shimmer 
          }} />
          <div style={{ 
            height: '40px', 
            borderRadius: '8px',
            ...shimmer 
          }} />
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
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
      console.log('✅ Accès autorisé à la première salle pour:', supabaseUser.email)

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
    const handlePageUnload = async (e) => {
      try {
        // Distinguer refresh (F5) vs fermeture réelle de l'onglet
        const isRefresh = e.persisted || (window.performance && window.performance.navigation.type === 1)
        
        if (isRefresh) {
          console.log('🔄 Refresh détecté - Session préservée')
          return // Ne pas désactiver la session sur refresh
        }
        
        console.log('🚪 Fermeture réelle détectée - Déconnexion forcée...')
        
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

    // Écouter seulement la fermeture réelle (pas beforeunload qui se déclenche au refresh)
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

  // État de chargement avec skeleton anti-flickering
  if (isLoading) {
    return <SkeletonLoader />
  }

  // État de redirection avec skeleton pour éviter flickering
  if (!user || !sessionValid) {
    return <SkeletonLoader />
  }

  const planningItems = [
    { title: "Planning Coordonnateur", icon: "📅", href: "/planning-coordo" },
    { title: "Valider Changements", icon: "✅", href: "/valider-changements" },
    { title: "Prise Contrôle Formateur", icon: "🎮", href: "/prise-controle-formateur" },
    { title: "Valider Planning Type", icon: "👨‍🏫", href: "/planning-type-formateurs" },
    { title: "Planning Type Apprenants", icon: "👨‍🎓", href: "/planning-type-apprenants" }
  ]


  const gestionItems = [
    { title: "Gestion Formateurs", icon: "👨‍🏫", href: "/gestion-formateurs" },
    { title: "Gestion Apprenants", icon: "👨‍🎓", href: "/gestion-apprenants" },
    { title: "Gestion Salariés", icon: "👷‍♂️", href: "/gestion-salaries" },
    { title: "Gestion Lieux", icon: "📍", href: "/gestion-lieux" },
    { title: "Gestion Absences Formateur", icon: "📊", href: "/gestion-absences-formateur" }
  ]


  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      opacity: 1,
      transition: 'opacity 0.3s ease-in-out'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            ACLEF Planning Administration
          </h1>
          <p style={{ color: '#6b7280', marginTop: '5px' }}>
            Bienvenue {user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'ACLEF Admin'}
            <span style={{ 
              marginLeft: '5px', 
              fontSize: '12px', 
              color: inactivityTime >= 240 ? '#dc2626' : inactivityTime >= 180 ? '#f59e0b' : '#10b981',
              backgroundColor: inactivityTime >= 240 ? '#fee2e2' : inactivityTime >= 180 ? '#fef3c7' : '#d1fae5',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>
              {inactivityTime >= 300 ? '😴 ENDORMI!' : 
               inactivityTime >= 240 ? `⚠️ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
               inactivityTime >= 180 ? `⏰ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
               `🟢 Actif`}
            </span>
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          🚪 Déconnexion
        </button>
      </div>

      {/* Layout Principal : Planning + Gestion | Messagerie */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '350px 1fr',
        gap: '20px',
        minHeight: 'calc(100vh - 200px)'
      }}>
        
        {/* Colonne 1 : Planning + Gestion */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          
          {/* Bloc Planning */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            flex: 1
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#3b82f6',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3b82f620'
            }}>
              📅 Planning
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {planningItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(item.href)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: 'white',
                    border: '1px solid #3b82f630',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f610'
                    e.currentTarget.style.transform = 'translateX(5px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bloc Gestion */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            flex: 1
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#10b981',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #10b98120'
            }}>
              👥 Gestion
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {gestionItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(item.href)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: 'white',
                    border: '1px solid #10b98130',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#10b98110'
                    e.currentTarget.style.transform = 'translateX(5px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Colonne 2 : Messagerie - MessagerieSafeWrapper */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <MessagerieSafeWrapper 
            user={user}
            logout={logout}
            inactivityTime={inactivityTime}
            router={router}
          />
        </div>

      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        color: 'white',
        fontSize: '14px',
        opacity: 0.8
      }}>
        ACLEF Planning v8.0
      </div>
    </div>
  )
}

export default Dashboard