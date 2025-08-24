import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Composant de fallback en cas d'erreur
const MessagerieFallback = ({ error }) => {
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        textAlign: 'center',
        color: '#f59e0b'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📧</div>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#f59e0b',
          marginBottom: '10px'
        }}>
          Messagerie en Maintenance
        </h2>
        <p style={{ 
          color: '#6b7280', 
          fontSize: '14px',
          marginBottom: '15px'
        }}>
          Le système de communication est temporairement indisponible.
        </p>
        
        {/* Actions de base disponibles */}
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '15px',
          margin: '15px 0',
          fontSize: '12px',
          color: '#92400e'
        }}>
          <strong>🔧 Statut:</strong> Système en cours de diagnostic<br/>
          {error && (
            <>
              <strong>📋 Détail technique:</strong> {error.message}
            </>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '200px'
        }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🔄 Réessayer
          </button>
          
          <button
            onClick={() => console.log('Messagerie fallback - Mode dégradé actif')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📋 Mode Dégradé
          </button>
        </div>
      </div>
    </div>
  )
}

// Wrapper de test sécurisé
function MessagerieSafeWrapper({ user, logout, inactivityTime, router }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canLoadMessagerie, setCanLoadMessagerie] = useState(false)

  // Test de connectivité Supabase
  const testSupabaseConnection = async () => {
    try {
      console.log('🔍 Test connexion Supabase...')
      
      // Test simple de connexion
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)

      if (error) {
        throw new Error(`Connexion Supabase échouée: ${error.message}`)
      }

      console.log('✅ Connexion Supabase OK')
      return true

    } catch (err) {
      console.error('❌ Test Supabase échoué:', err)
      setError(err)
      return false
    }
  }

  // Test de chargement des données messagerie
  const testMessagerieData = async () => {
    try {
      console.log('🔍 Test données messagerie...')

      // Test chargement formateurs
      const { data: formateurs, error: formateurError } = await supabase
        .from('users')
        .select('id, prenom, nom')
        .eq('role', 'formateur')
        .eq('archive', false)
        .limit(5)

      if (formateurError) {
        throw new Error(`Erreur formateurs: ${formateurError.message}`)
      }

      // Test chargement messages
      const { data: messages, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .limit(5)

      if (messageError) {
        throw new Error(`Erreur messages: ${messageError.message}`)
      }

      console.log('✅ Données messagerie OK:', {
        formateurs: formateurs?.length || 0,
        messages: messages?.length || 0
      })

      return true

    } catch (err) {
      console.error('❌ Test données messagerie échoué:', err)
      setError(err)
      return false
    }
  }

  // Test complet au chargement
  useEffect(() => {
    const runTests = async () => {
      try {
        setIsLoading(true)
        setHasError(false)
        setError(null)

        console.log('🧪 Début tests MessagerieDashboard...')

        // Test 1: Connexion Supabase
        const supabaseOK = await testSupabaseConnection()
        if (!supabaseOK) {
          setHasError(true)
          return
        }

        // Test 2: Données messagerie
        const dataOK = await testMessagerieData()
        if (!dataOK) {
          setHasError(true)
          return
        }

        // Tous les tests passés
        console.log('🎉 Tous les tests passés ! MessagerieDashboard peut être chargé')
        setCanLoadMessagerie(true)

      } catch (err) {
        console.error('❌ Erreur générale tests:', err)
        setError(err)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    runTests()
  }, [])

  // Chargement en cours
  if (isLoading) {
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🧪</div>
          <div>Test du système de communication...</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
            Vérification Supabase et données messagerie
          </div>
        </div>
      </div>
    )
  }

  // Erreur détectée
  if (hasError || !canLoadMessagerie) {
    return <MessagerieFallback error={error} />
  }

  // Tests passés - Charger MessagerieDashboard
  try {
    // Import dynamique sécurisé
    const MessagerieDashboard = require('../components/MessagerieDashboard').default
    
    console.log('✅ Chargement MessagerieDashboard autorisé')
    return <MessagerieDashboard 
      user={user}
      logout={logout}
      inactivityTime={inactivityTime}
      router={router}
    />

  } catch (err) {
    console.error('❌ Erreur chargement MessagerieDashboard:', err)
    return <MessagerieFallback error={err} />
  }
}

export default MessagerieSafeWrapper