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
        padding: '12px 20px',
        marginBottom: '15px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          height: '28px',
          width: '300px',
          borderRadius: '4px',
          ...shimmer
        }} />
        <div style={{
          height: '40px',
          width: '120px',
          borderRadius: '8px',
          ...shimmer
        }} />
      </div>

      {/* Bandeau blanc Skeleton */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '10px 20px',
        marginBottom: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          height: '16px',
          width: '150px',
          borderRadius: '4px',
          ...shimmer
        }} />
        <div style={{
          height: '24px',
          width: '80px',
          borderRadius: '4px',
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
  const [connectedAdmins, setConnectedAdmins] = useState([]) // Liste des admins connectés
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

      // Mettre à jour le heartbeat et l'email
      await supabase
        .from('admin_sessions')
        .update({
          heartbeat: new Date().toISOString(),
          admin_email: supabaseUser.email // Toujours mettre à jour l'email
        })
        .eq('id', adminSession.id)

      console.log('✅ Session admin valide dans la Table d\'Émeraude')
      return true

    } catch (error) {
      console.error('Erreur vérification session admin:', error)
      return false
    }
  }

  // Fonction pour récupérer la liste des admins connectés
  const fetchConnectedAdmins = async () => {
    try {
      // Récupérer les sessions actives avec l'email directement
      const { data: sessions, error: sessionsError } = await supabase
        .from('admin_sessions')
        .select('admin_user_id, admin_email, current_page, page_priority, heartbeat')
        .eq('is_active', true)
        .order('heartbeat', { ascending: false })

      if (sessionsError) {
        console.error('❌ Erreur récupération sessions:', sessionsError)
        return
      }

      if (!sessions || sessions.length === 0) {
        console.log('👥 Aucun admin connecté')
        setConnectedAdmins([])
        return
      }

      // Formater les données pour l'affichage - ne garder que ceux avec email valide
      const adminsFormatted = sessions
        .filter(session => session.admin_email) // Filtrer les sessions sans email
        .map(session => ({
          email: session.admin_email,
          name: session.admin_email.split('@')[0].charAt(0).toUpperCase() + session.admin_email.split('@')[0].slice(1),
          currentPage: session.current_page,
          priority: session.page_priority,
          lastActive: session.heartbeat
        }))

      setConnectedAdmins(adminsFormatted)
      console.log('👥 Admins connectés:', adminsFormatted)

    } catch (error) {
      console.error('❌ Erreur fetchConnectedAdmins:', error)
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

      // 🏠 SUR L'ACCUEIL : Effacer current_page et recalculer les priorités de l'ancienne page
      const { data: currentSession } = await supabase
        .from('admin_sessions')
        .select('current_page')
        .eq('admin_user_id', supabaseUser.id)
        .eq('is_active', true)
        .single()

      if (currentSession?.current_page && currentSession.current_page !== '/') {
        const oldPage = currentSession.current_page
        console.log(`🏠 Arrivée sur l'accueil depuis ${oldPage}`)

        // Mettre current_page à null
        await supabase
          .from('admin_sessions')
          .update({
            current_page: null,
            page_priority: 999,
            page_entry_time: null
          })
          .eq('admin_user_id', supabaseUser.id)

        // Recalculer les priorités de l'ancienne page
        const { data: sessions } = await supabase
          .from('admin_sessions')
          .select('*')
          .eq('current_page', oldPage)
          .eq('is_active', true)
          .order('page_entry_time', { ascending: true })

        if (sessions) {
          for (let i = 0; i < sessions.length; i++) {
            await supabase
              .from('admin_sessions')
              .update({ page_priority: i + 1 })
              .eq('id', sessions[i].id)
          }
          console.log(`✅ Priorités recalculées pour ${oldPage}: ${sessions.length} admin(s)`)
        }
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
              .update({
                heartbeat: now,
                admin_email: currentUser.email // Toujours mettre à jour l'email
              })
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

    // 🏠 PAS D'EXPULSION SUR L'ACCUEIL : C'est déjà la page de repos
    // Les autres pages redirigent vers l'accueil après inactivité
    const surveillantInterval = setInterval(async () => {
      // Aucune action sur l'accueil - page de repos par défaut
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
    }
  }, [router, sessionValid])

  // 👥 Charger et écouter les admins connectés en temps réel
  useEffect(() => {
    if (!user) return

    // Charger la liste initiale
    fetchConnectedAdmins()

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('admin_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_sessions'
        },
        (payload) => {
          console.log('🔄 Changement admin_sessions détecté, refresh liste admins')
          fetchConnectedAdmins()
        }
      )
      .subscribe()

    // Refresh périodique toutes les 30 secondes
    const refreshInterval = setInterval(() => {
      fetchConnectedAdmins()
    }, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(refreshInterval)
    }
  }, [user])

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
    { title: "Planning Type Apprenants", icon: "👨‍🎓", href: "/planning-type-apprenants" },
    { title: "Absences Apprenants", icon: "🚫", href: "/absence-apprenant" }
  ]


  const gestionItems = [
    { title: "Gestion Formateurs", icon: "👨‍🏫", href: "/gestion-formateurs" },
    { title: "Gestion Apprenants", icon: "👨‍🎓", href: "/gestion-apprenants" },
    { title: "Gestion Salariés", icon: "👷‍♂️", href: "/gestion-salaries" },
    { title: "Gestion Lieux", icon: "📍", href: "/gestion-lieux" },
    { title: "Gestion Présences Formateur", icon: "📊", href: "/gestion-absences-formateur" },
    { title: "Suivi Post-Formation", icon: "📋", href: "/suivi-post-formation" },
    { title: "Comparaison Dates Excel", icon: "📊", href: "/comparaison-dates-excel" }
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
        padding: '12px 20px',
        marginBottom: '15px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
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

      {/* Bandeau blanc - Bienvenue et admins connectés */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '10px 20px',
        marginBottom: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '16px' }}>
          Bienvenue {user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'ACLEF Admin'}
        </p>

        {/* Liste des autres admins connectés */}
        {connectedAdmins.filter(admin => admin.email !== user?.email).length > 0 && (
          <>
            <div style={{
              width: '1px',
              height: '24px',
              backgroundColor: '#e5e7eb'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span style={{
                color: '#9ca3af',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                👥
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {connectedAdmins.filter(admin => admin.email !== user?.email).map((admin, index) => {
                  let action, pageName;

                  if (!admin.currentPage || admin.currentPage === '/' || admin.currentPage === '') {
                    action = 'consulte';
                    pageName = 'la messagerie';
                  } else {
                    action = 'consulte';
                    pageName = admin.currentPage.replace('/', '').replace(/-/g, ' ');
                  }

                  return (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      backgroundColor: '#10b981',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: 'white'
                    }}>
                      <span style={{ fontWeight: '600' }}>
                        {admin.name}
                      </span>
                      <span style={{ fontWeight: '400' }}>
                        {action} {pageName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
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