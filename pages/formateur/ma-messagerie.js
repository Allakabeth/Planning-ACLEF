import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useFormateurAuth } from '../../contexts/FormateurAuthContext'

export default function MaMessagerie() {
  const [vue, setVue] = useState('liste') // 'liste', 'lecture', 'nouveau'
  const [ongletActif, setOngletActif] = useState('non_lus') // 'non_lus', 'lus', 'archives'
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [nouveauMessage, setNouveauMessage] = useState('')
  const [objet, setObjet] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const { user, isLoading, isAuthenticated } = useFormateurAuth()
  const router = useRouter()

  // Protection authentification
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/formateur/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Charger les messages quand l'utilisateur est connecté
  useEffect(() => {
    if (user && user.id) {
      chargerMessages(user.id)
      setLoading(false)
    }
  }, [user])

  const chargerMessages = async (formateurId) => {
    try {
      // Charger messages reçus par ce formateur
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('destinataire_id', formateurId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur chargement messages:', error)
        return
      }

      setMessages(messagesData || [])
      console.log('Messages chargés:', messagesData?.length || 0)
      
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  // Envoyer un message vers admin
  const envoyerMessage = async () => {
    if (!objet.trim() || !nouveauMessage.trim()) {
      alert('⚠️ Veuillez remplir l\'objet et le message')
      return
    }

    if (!user?.id) {
      alert('⚠️ Erreur: Utilisateur non identifié')
      return
    }

    try {
      setSending(true)
      
      const { error } = await supabase
        .from('messages')
        .insert({
          expediteur_id: user.id,
          destinataire_id: null, // null = admin
          expediteur: `${user.prenom} ${user.nom}`,
          destinataire: 'Coordination ACLEF',
          objet: objet.trim(),
          contenu: nouveauMessage.trim(),
          type: 'messagerie',
          lu: false,
          archive: false,
          statut_validation: 'nouveau',
          date: new Date().toISOString().split('T')[0],
          heure: new Date().toTimeString().slice(0, 5)
        })

      if (error) {
        console.error('Erreur envoi message:', error)
        alert('❌ Erreur lors de l\'envoi: ' + error.message)
        return
      }

      console.log('Message envoyé vers admin')
      alert('✅ Message envoyé avec succès !')
      
      // Reset formulaire
      setObjet('')
      setNouveauMessage('')
      setVue('liste')
      
    } catch (error) {
      console.error('Erreur:', error)
      alert('❌ Erreur: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  // Marquer comme lu
  const marquerCommeLu = async (messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ lu: true })
        .eq('id', messageId)

      if (error) throw error

      // Recharger messages
      if (user?.id) {
        chargerMessages(user.id)
      }
      
    } catch (error) {
      console.error('Erreur marquer lu:', error)
      alert('Erreur: ' + error.message)
    }
  }

  // Archiver un message
  const archiverMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          archive: true,
          lu: true, // Marquer comme lu aussi
          date_archivage: new Date().toISOString().split('T')[0]
        })
        .eq('id', messageId)

      if (error) throw error

      alert('📁 Message archivé avec succès !')
      
      // Recharger et aller à l'onglet archives
      if (user?.id) {
        chargerMessages(user.id)
      }
      setOngletActif('archives')
      setVue('liste')
      setSelectedMessage(null)
      
    } catch (error) {
      console.error('Erreur archivage:', error)
      alert('Erreur archivage: ' + error.message)
    }
  }

  // Supprimer définitivement un message
  const supprimerMessage = async (messageId) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer définitivement ce message ?\n\nCette action est irréversible.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error

      alert('🗑️ Message supprimé définitivement !')
      
      // Recharger messages
      if (user?.id) {
        chargerMessages(user.id)
      }
      setVue('liste')
      setSelectedMessage(null)
      
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur suppression: ' + error.message)
    }
  }

  // Ouvrir un message
  const ouvrirMessage = (message) => {
    setSelectedMessage(message)
    setVue('lecture')
    // Marquer comme lu automatiquement si pas encore lu
    if (!message.lu) {
      marquerCommeLu(message.id)
    }
  }

  // Filtrer les messages selon l'onglet actif
  const getMessagesFiltres = () => {
    switch (ongletActif) {
      case 'non_lus':
        return messages.filter(m => !m.lu && !m.archive)
      case 'lus':
        return messages.filter(m => m.lu && !m.archive)
      case 'archives':
        return messages.filter(m => m.archive)
      default:
        return []
    }
  }

  // Compter messages non lus
  const messagesNonLus = messages.filter(m => !m.lu && !m.archive).length

  // Protection si pas authentifié
  if (!user) {
    return null
  }

  if (loading || isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <div>Chargement de la messagerie...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        margin: '0 auto'
      }}>
        
        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#333'
          }}>
            Ma Messagerie
          </h1>

          {/* Indicateur messages non lus */}
          {messagesNonLus > 0 && (
            <div style={{
              padding: '12px 20px',
              borderRadius: '25px',
              backgroundColor: '#fee2e2',
              border: '2px solid #fecaca',
              color: '#991b1b',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '15px',
              display: 'inline-block'
            }}>
              {messagesNonLus} nouveau{messagesNonLus > 1 ? 'x' : ''} message{messagesNonLus > 1 ? 's' : ''}
            </div>
          )}

          {/* Bouton nouveau message - remonté */}
          <div style={{ marginBottom: '25px' }}>
            <button
              onClick={() => setVue('nouveau')}
              disabled={sending}
              style={{
                width: '100%',
                backgroundColor: '#10b981',
                color: 'white',
                padding: '18px',
                borderRadius: '20px',
                border: 'none',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: sending ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s ease',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                opacity: sending ? 0.6 : 1
              }}
              onMouseOver={(e) => !sending && (e.target.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => !sending && (e.target.style.transform = 'translateY(0)')}
            >
              Envoyer un message
            </button>
          </div>
        </div>

        {/* VUE LISTE DES MESSAGES */}
        {vue === 'liste' && (
          <>
            {/* Onglets */}
            <div style={{
              display: 'flex',
              marginBottom: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '20px',
              padding: '6px',
              gap: '4px'
            }}>
              <button
                onClick={() => setOngletActif('non_lus')}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  borderRadius: '16px',
                  border: ongletActif === 'non_lus' ? 'none' : '2px solid #ef4444',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: ongletActif === 'non_lus' ? '#ef4444' : 'transparent',
                  color: ongletActif === 'non_lus' ? 'white' : '#ef4444',
                  transition: 'all 0.2s ease'
                }}
              >
                Non lus ({messages.filter(m => !m.lu && !m.archive).length})
              </button>
              <button
                onClick={() => setOngletActif('lus')}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  borderRadius: '16px',
                  border: ongletActif === 'lus' ? 'none' : '2px solid #10b981',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: ongletActif === 'lus' ? '#10b981' : 'transparent',
                  color: ongletActif === 'lus' ? 'white' : '#10b981',
                  transition: 'all 0.2s ease'
                }}
              >
                Lus ({messages.filter(m => m.lu && !m.archive).length})
              </button>
              <button
                onClick={() => setOngletActif('archives')}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  borderRadius: '16px',
                  border: ongletActif === 'archives' ? 'none' : '2px solid #f59e0b',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: ongletActif === 'archives' ? '#f59e0b' : 'transparent',
                  color: ongletActif === 'archives' ? 'white' : '#f59e0b',
                  transition: 'all 0.2s ease'
                }}
              >
                Archives ({messages.filter(m => m.archive).length})
              </button>
            </div>

            {/* Liste des messages filtrés */}
            <div style={{ marginBottom: '25px' }}>
              {getMessagesFiltres().length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '18px', marginBottom: '20px' }}>
                    {ongletActif === 'non_lus' ? 'Aucun message non lu' :
                     ongletActif === 'lus' ? 'Aucun message lu' :
                     'Aucun message archivé'}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  maxHeight: '500px',
                  overflowY: 'auto',
                  paddingRight: '5px'
                }}>
                  {getMessagesFiltres()
                    .sort((a, b) => {
                      const dateA = new Date(a.created_at)
                      const dateB = new Date(b.created_at)
                      return dateB - dateA
                    })
                    .map((message) => (
                    <div
                      key={message.id}
                      onClick={() => ouvrirMessage(message)}
                      style={{
                        backgroundColor: message.lu ? '#f9fafb' : '#eff6ff',
                        border: `3px solid ${message.archive ? '#f59e0b' : message.lu ? '#e5e7eb' : '#3b82f6'}`,
                        borderRadius: '20px',
                        padding: '18px',
                        marginBottom: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)'
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          fontWeight: message.lu ? 'normal' : 'bold',
                          color: '#333',
                          fontSize: '16px'
                        }}>
                          {message.expediteur}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#666'
                        }}>
                          {message.date} {message.heure}
                        </div>
                      </div>

                      <div style={{
                        fontWeight: message.lu ? 'normal' : 'bold',
                        color: '#333',
                        fontSize: '17px',
                        marginBottom: '8px'
                      }}>
                        {message.objet}
                      </div>

                      <div style={{
                        color: '#666',
                        fontSize: '15px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {message.contenu.substring(0, 80)}...
                      </div>

                      {!message.lu && !message.archive && (
                        <div style={{
                          marginTop: '10px',
                          display: 'inline-block',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          fontSize: '12px',
                          padding: '4px 12px',
                          borderRadius: '15px',
                          fontWeight: 'bold'
                        }}>
                          NOUVEAU
                        </div>
                      )}

                      {message.archive && (
                        <div style={{
                          marginTop: '10px',
                          display: 'inline-block',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          fontSize: '12px',
                          padding: '4px 12px',
                          borderRadius: '15px',
                          fontWeight: 'bold'
                        }}>
                          ARCHIVÉ
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* VUE LECTURE MESSAGE */}
        {vue === 'lecture' && selectedMessage && (
          <>
            {/* Header lecture */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '25px',
              paddingBottom: '20px',
              borderBottom: '3px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setVue('liste')}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '12px 18px',
                    borderRadius: '15px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    marginRight: '15px',
                    fontWeight: 'bold'
                  }}
                >
                  Retour
                </button>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  Lecture
                </div>
              </div>

              {/* Actions selon l'état du message */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {!selectedMessage.archive ? (
                  <button
                    onClick={() => archiverMessage(selectedMessage.id)}
                    style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      padding: '12px 18px',
                      borderRadius: '15px',
                      fontSize: '16px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Archiver
                  </button>
                ) : (
                  <button
                    onClick={() => supprimerMessage(selectedMessage.id)}
                    style={{
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '12px 18px',
                      borderRadius: '15px',
                      fontSize: '16px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>

            {/* Contenu message */}
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '20px',
              padding: '25px',
              marginBottom: '25px'
            }}>
              <div style={{
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>De : </span>
                  <span style={{ color: '#666', fontSize: '16px' }}>{selectedMessage.expediteur}</span>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>Objet : </span>
                  <span style={{ color: '#333', fontWeight: 'bold', fontSize: '16px' }}>{selectedMessage.objet}</span>
                </div>
                <div style={{ marginBottom: selectedMessage.archive ? '10px' : '0' }}>
                  <span style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>Date : </span>
                  <span style={{ color: '#666', fontSize: '16px' }}>
                    {selectedMessage.date} à {selectedMessage.heure}
                  </span>
                </div>
                {selectedMessage.archive && selectedMessage.date_archivage && (
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '16px' }}>Archivé le : </span>
                    <span style={{ color: '#f59e0b', fontSize: '16px' }}>
                      {selectedMessage.date_archivage}
                    </span>
                  </div>
                )}
              </div>

              <div style={{
                color: '#374151',
                fontSize: '17px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedMessage.contenu}
              </div>

              {/* Avertissement pour messages archivés */}
              {selectedMessage.archive && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#92400e'
                }}>
                  ⚠️ <strong>Message archivé</strong> - Sera supprimé automatiquement après 3 mois d'archivage
                </div>
              )}
            </div>
          </>
        )}

        {/* VUE NOUVEAU MESSAGE */}
        {vue === 'nouveau' && (
          <>
            {/* Header nouveau */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '25px',
              paddingBottom: '20px',
              borderBottom: '3px solid #e5e7eb'
            }}>
              <button
                onClick={() => setVue('liste')}
                disabled={sending}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '15px',
                  fontSize: '16px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  marginRight: '15px',
                  fontWeight: 'bold',
                  opacity: sending ? 0.6 : 1
                }}
              >
                Annuler
              </button>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                Nouveau message
              </div>
            </div>

            {/* Formulaire */}
            <div style={{ marginBottom: '25px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  À : Coordination ACLEF
                </label>
                <div style={{
                  padding: '15px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '15px',
                  color: '#666',
                  fontSize: '16px'
                }}>
                  Votre message sera envoyé à l'équipe de coordination
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Objet *
                </label>
                <input
                  type="text"
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  placeholder="De quoi voulez-vous parler ?"
                  disabled={sending}
                  style={{
                    width: '100%',
                    padding: '15px',
                    border: '3px solid #e5e7eb',
                    borderRadius: '15px',
                    fontSize: '18px',
                    boxSizing: 'border-box',
                    backgroundColor: sending ? '#f3f4f6' : 'white'
                  }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Votre message *
                </label>
                <textarea
                  value={nouveauMessage}
                  onChange={(e) => setNouveauMessage(e.target.value)}
                  placeholder="Écrivez votre message ici..."
                  rows={6}
                  disabled={sending}
                  style={{
                    width: '100%',
                    padding: '15px',
                    border: '3px solid #e5e7eb',
                    borderRadius: '15px',
                    fontSize: '18px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    backgroundColor: sending ? '#f3f4f6' : 'white'
                  }}
                />
              </div>

              <button
                onClick={envoyerMessage}
                disabled={sending}
                style={{
                  width: '100%',
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '18px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  opacity: sending ? 0.6 : 1
                }}
                onMouseOver={(e) => !sending && (e.target.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => !sending && (e.target.style.transform = 'translateY(0)')}
              >
                {sending ? 'Envoi en cours...' : 'Envoyer le message'}
              </button>
            </div>
          </>
        )}

        {/* Bouton retour accueil */}
        <button
          onClick={() => router.push('/formateur')}
          style={{
            width: '100%',
            padding: '12px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '16px',
            transition: 'transform 0.2s'
          }}
        >
          Retour à l'accueil
        </button>

        {/* Stats */}
        <div style={{
          marginTop: '20px',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          {messages.length} messages • {messagesNonLus} non lus
        </div>
      </div>
    </div>
  )
}