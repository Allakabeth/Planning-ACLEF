import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

function MessagerieDashboard({ user, logout, inactivityTime, router }) {
  const [formateurs, setFormateurs] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [newMessage, setNewMessage] = useState({
    destinataire: '',
    objet: '',
    contenu: ''
  })
  const [sending, setSending] = useState(false)
  const [validating, setValidating] = useState(false)
  // ✅ NOUVEAU: Filtre actif
  const [filtreActif, setFiltreActif] = useState('tous')
  const [formateurFiltre, setFormateurFiltre] = useState('tous')

  useEffect(() => {
    chargerDonnees()
  }, [])

  const chargerDonnees = async () => {
    try {
      setLoading(true)
      
      // Charger formateurs
      const { data: formateursData, error: formateurError } = await supabase
        .from('users')
        .select('id, prenom, nom')
        .eq('role', 'formateur')
        .eq('archive', false)
        .order('prenom')

      if (formateurError) throw formateurError

      // Charger messages (admin reçus + envoyés)
      const { data: messagesData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .or('expediteur_id.is.null,destinataire_id.is.null')
        .order('created_at', { ascending: false })

      if (messageError) throw messageError

      setFormateurs(formateursData || [])
      setMessages(messagesData || [])
      
      console.log('Données chargées:', {
        formateurs: formateursData?.length || 0,
        messages: messagesData?.length || 0
      })
      
    } catch (error) {
      console.error('Erreur chargement:', error)
      alert('Erreur chargement: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const envoyerMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.destinataire || !newMessage.objet.trim() || !newMessage.contenu.trim()) {
      alert('Veuillez remplir tous les champs')
      return
    }

    try {
      setSending(true)
      
      const formateurDestination = formateurs.find(f => f.id === newMessage.destinataire)
      
      const { error } = await supabase
        .from('messages')
        .insert({
          expediteur_id: null, // null = admin
          destinataire_id: newMessage.destinataire,
          expediteur: 'Coordination ACLEF',
          destinataire: `${formateurDestination.prenom} ${formateurDestination.nom}`,
          objet: newMessage.objet.trim(),
          contenu: newMessage.contenu.trim(),
          type: 'messagerie',
          lu: false,
          archive: false,
          statut_validation: 'nouveau',
          date: new Date().toISOString().split('T')[0],
          heure: new Date().toTimeString().slice(0, 5)
        })

      if (error) throw error

      alert('✅ Message envoyé avec succès !')
      
      // Reset formulaire et recharger
      setNewMessage({ destinataire: '', objet: '', contenu: '' })
      setShowNewMessage(false)
      chargerDonnees()
      
    } catch (error) {
      console.error('Erreur envoi:', error)
      alert('Erreur envoi: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const marquerCommeLu = async (messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ lu: true })
        .eq('id', messageId)

      if (error) throw error

      // Recharger messages
      chargerDonnees()
      
    } catch (error) {
      console.error('Erreur marquer lu:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const archiverMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          archive: true,
          date_archivage: new Date().toISOString().split('T')[0]
        })
        .eq('id', messageId)

      if (error) throw error

      alert('📁 Message archivé avec succès !')
      chargerDonnees()
      setSelectedMessage(null)
      
    } catch (error) {
      console.error('Erreur archivage:', error)
      alert('Erreur archivage: ' + error.message)
    }
  }

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
      chargerDonnees()
      setSelectedMessage(null)
      
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur suppression: ' + error.message)
    }
  }

  // ✅ MODIFIÉ: Fonction de validation avec auto-archivage
  const validerPlanningType = async (message) => {
    if (!message.expediteur_id) {
      alert('❌ Erreur: Impossible d\'identifier le formateur')
      return
    }

    try {
      setValidating(true)

      // 1. Changer le statut du message à "traité" ET archiver automatiquement
      const { error: messageError } = await supabase
        .from('messages')
        .update({ 
          statut_validation: 'traite',
          archive: true,
          date_archivage: new Date().toISOString().split('T')[0]
        })
        .eq('id', message.id)

      if (messageError) {
        console.error('Erreur mise à jour message:', messageError)
        alert('❌ Erreur lors de la mise à jour du message')
        return
      }

      // 2. Redirection vers la page de validation avec formateur pré-sélectionné
      const formateurId = message.expediteur_id
      const url = `/planning-type-formateurs?formateur=${formateurId}`
      
      console.log('✅ Redirection vers:', url)
      
      // Redirection avec router Next.js (préserve la session)
      router.push(url)
      
    } catch (error) {
      console.error('Erreur validation:', error)
      alert('❌ Erreur: ' + error.message)
    } finally {
      setValidating(false)
    }
  }

  // ✅ NOUVEAU: Fonction de validation des modifications ponctuelles
  const validerModificationsPonctuelles = async (message) => {
    if (!message.expediteur_id) {
      alert('❌ Erreur: Impossible d\'identifier le formateur')
      return
    }

    try {
      setValidating(true)

      // 1. Changer le statut du message à "traité" ET archiver automatiquement
      const { error: messageError } = await supabase
        .from('messages')
        .update({ 
          statut_validation: 'traite',
          archive: true,
          date_archivage: new Date().toISOString().split('T')[0]
        })
        .eq('id', message.id)

      if (messageError) {
        console.error('Erreur mise à jour message:', messageError)
        alert('❌ Erreur lors de la mise à jour du message')
        return
      }

      // 2. Redirection vers valider-changements.js avec formateur pré-sélectionné
      const formateurId = message.expediteur_id
      const url = `/valider-changements?formateur=${formateurId}`
      
      console.log('✅ Redirection vers validation changements:', url)
      
      // Redirection avec router Next.js (préserve la session)
      router.push(url)
      
    } catch (error) {
      console.error('Erreur validation modifications:', error)
      alert('❌ Erreur: ' + error.message)
    } finally {
      setValidating(false)
    }
  }

  const ouvrirMessage = (message) => {
    setSelectedMessage(message)
    // Marquer comme lu automatiquement si pas encore lu
    if (!message.lu) {
      marquerCommeLu(message.id)
    }
  }

  const getNomFormateur = (id) => {
    const formateur = formateurs.find(f => f.id === id)
    return formateur ? `${formateur.prenom} ${formateur.nom}` : 'Inconnu'
  }

  const getTypeMessage = (message) => {
    if (message.expediteur_id === null) {
      return 'Envoyé'
    } else {
      return 'Reçu'
    }
  }

  const estDemandeValidationPlanningType = (message) => {
    return message.objet === 'Validation de planning type' && 
           message.statut_validation === 'a_traiter' &&
           message.expediteur_id !== null
  }

  // ✅ NOUVEAU: Vérifier si le message est une demande de validation modifications
  const estDemandeValidationModifications = (message) => {
    return message.objet === 'Validation de modification ponctuelle' && 
           message.statut_validation === 'a_traiter' &&
           message.expediteur_id !== null
  }

  // ✅ NOUVEAU: Fonctions de filtrage et comptage
  const getMessagesFiltres = () => {
    let messagesFiltres = [...messages]
    
    // Filtre par formateur
    if (formateurFiltre !== 'tous') {
      messagesFiltres = messagesFiltres.filter(m => 
        m.expediteur_id === formateurFiltre || m.destinataire_id === formateurFiltre
      )
    }
    
    // Filtre par catégorie
    switch (filtreActif) {
      case 'non_lus':
        return messagesFiltres.filter(m => !m.lu && !m.archive)
      case 'lus':
        return messagesFiltres.filter(m => m.lu && !m.archive)
      case 'validation_planning_a_traiter':
        return messagesFiltres.filter(m => 
          m.objet === 'Validation de planning type' && 
          m.statut_validation === 'a_traiter' && 
          !m.archive
        )
      case 'validation_planning_traitees':
        return messagesFiltres.filter(m => 
          m.objet === 'Validation de planning type' && 
          m.statut_validation === 'traite'
        )
      case 'validation_modif_a_traiter':
        return messagesFiltres.filter(m => 
          m.objet === 'Validation de modification ponctuelle' && 
          m.statut_validation === 'a_traiter' && 
          !m.archive
        )
      case 'validation_modif_traitees':
        return messagesFiltres.filter(m => 
          m.objet === 'Validation de modification ponctuelle' && 
          m.statut_validation === 'traite'
        )
      case 'archives':
        return messagesFiltres.filter(m => m.archive)
      case 'tous':
      default:
        return messagesFiltres
    }
  }

  // ✅ NOUVEAU: Compteurs par catégorie
  const getCompteurs = () => {
    return {
      non_lus: messages.filter(m => !m.lu && !m.archive).length,
      lus: messages.filter(m => m.lu && !m.archive).length,
      validation_planning_a_traiter: messages.filter(m => 
        m.objet === 'Validation de planning type' && 
        m.statut_validation === 'a_traiter' && 
        !m.archive
      ).length,
      validation_planning_traitees: messages.filter(m => 
        m.objet === 'Validation de planning type' && 
        m.statut_validation === 'traite'
      ).length,
      validation_modif_a_traiter: messages.filter(m => 
        m.objet === 'Validation de modification ponctuelle' && 
        m.statut_validation === 'a_traiter' && 
        !m.archive
      ).length,
      validation_modif_traitees: messages.filter(m => 
        m.objet === 'Validation de modification ponctuelle' && 
        m.statut_validation === 'traite'
      ).length,
      archives: messages.filter(m => m.archive).length,
      tous: messages.length
    }
  }

  const getBadgeStatut = (message) => {
    if (message.statut_validation === 'a_traiter') {
      // ✅ NOUVEAU: Couleur différente selon le type de validation
      const couleur = message.objet === 'Validation de modification ponctuelle' ? '#ea580c' : '#dc2626'
      
      return (
        <span style={{
          backgroundColor: couleur,
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '600',
          marginTop: '4px',
          display: 'inline-block'
        }}>
          À TRAITER
        </span>
      )
    }
    
    if (message.statut_validation === 'traite') {
      return (
        <span style={{
          backgroundColor: '#059669',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '600',
          marginTop: '4px',
          display: 'inline-block'
        }}>
          TRAITÉ
        </span>
      )
    }

    if (!message.lu) {
      return (
        <span style={{
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '600',
          marginTop: '4px',
          display: 'inline-block'
        }}>
          NOUVEAU
        </span>
      )
    }

    if (message.archive) {
      return (
        <span style={{
          backgroundColor: '#f59e0b',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '600',
          marginTop: '4px',
          display: 'inline-block'
        }}>
          ARCHIVÉ
        </span>
      )
    }

    return null
  }

  const messagesNonLus = messages.filter(m => !m.lu && !m.archive).length
  const messagesFiltres = getMessagesFiltres()
  const compteurs = getCompteurs()

  if (loading) {
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
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <div>Chargement de la messagerie...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      
      {/* Titre Messagerie */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#f59e0b',
            margin: 0
          }}>
            Messagerie ({messages.length} messages, {messagesNonLus} non lus)
          </h2>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '6px 10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🏠
          </button>
        </div>
        <button
          onClick={() => setShowNewMessage(!showNewMessage)}
          disabled={sending}
          style={{
            padding: '10px 20px',
            background: showNewMessage ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.6 : 1
          }}
        >
          {showNewMessage ? 'Annuler' : 'Nouveau Message'}
        </button>
      </div>

      {/* Formulaire nouveau message */}
      {showNewMessage && (
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>Nouveau Message</h3>
          <form onSubmit={envoyerMessage}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Destinataire *
                </label>
                <select
                  value={newMessage.destinataire}
                  onChange={(e) => setNewMessage({...newMessage, destinataire: e.target.value})}
                  required
                  disabled={sending}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: sending ? '#f3f4f6' : 'white'
                  }}
                >
                  <option value="">-- Choisir un formateur --</option>
                  {formateurs.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.prenom} {f.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Objet *
                </label>
                <input
                  type="text"
                  value={newMessage.objet}
                  onChange={(e) => setNewMessage({...newMessage, objet: e.target.value})}
                  placeholder="Objet du message"
                  required
                  disabled={sending}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: sending ? '#f3f4f6' : 'white'
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Message *
              </label>
              <textarea
                value={newMessage.contenu}
                onChange={(e) => setNewMessage({...newMessage, contenu: e.target.value})}
                placeholder="Tapez votre message ici..."
                required
                rows={4}
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  resize: 'vertical',
                  backgroundColor: sending ? '#f3f4f6' : 'white'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={sending}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: sending ? 0.6 : 1
                }}
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewMessage({ destinataire: '', objet: '', contenu: '' })
                  setShowNewMessage(false)
                }}
                disabled={sending}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: sending ? 0.6 : 1
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ✅ NOUVEAU: Bandeau filtres compact sans titre */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '12px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center'
        }}>
          
          {/* Badges compacts avec compteurs */}
          <div
            onClick={() => setFiltreActif('validation_planning_a_traiter')}
            style={{
              padding: '4px 8px',
              backgroundColor: filtreActif === 'validation_planning_a_traiter' ? '#dc2626' : '#fee2e2',
              color: filtreActif === 'validation_planning_a_traiter' ? 'white' : '#dc2626',
              border: `1px solid ${filtreActif === 'validation_planning_a_traiter' ? '#dc2626' : '#fecaca'}`,
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Planning à traiter ({compteurs.validation_planning_a_traiter})
          </div>
          
          {/* ✅ NOUVEAU: Badge modifications avec couleur orange */}
          <div
            onClick={() => setFiltreActif('validation_modif_a_traiter')}
            style={{
              padding: '4px 8px',
              backgroundColor: filtreActif === 'validation_modif_a_traiter' ? '#ea580c' : '#fed7aa',
              color: filtreActif === 'validation_modif_a_traiter' ? 'white' : '#ea580c',
              border: `1px solid ${filtreActif === 'validation_modif_a_traiter' ? '#ea580c' : '#fdba74'}`,
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Modifications à traiter ({compteurs.validation_modif_a_traiter})
          </div>
          
          <div
            onClick={() => setFiltreActif('non_lus')}
            style={{
              padding: '4px 8px',
              backgroundColor: filtreActif === 'non_lus' ? '#3b82f6' : '#dbeafe',
              color: filtreActif === 'non_lus' ? 'white' : '#3b82f6',
              border: `1px solid ${filtreActif === 'non_lus' ? '#3b82f6' : '#93c5fd'}`,
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Non lus ({compteurs.non_lus})
          </div>
          
          <div
            onClick={() => setFiltreActif('archives')}
            style={{
              padding: '4px 8px',
              backgroundColor: filtreActif === 'archives' ? '#6b7280' : '#f3f4f6',
              color: filtreActif === 'archives' ? 'white' : '#6b7280',
              border: `1px solid ${filtreActif === 'archives' ? '#6b7280' : '#d1d5db'}`,
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Archives ({compteurs.archives})
          </div>

          {/* Séparateur */}
          <div style={{
            width: '1px',
            height: '20px',
            backgroundColor: '#d1d5db',
            margin: '0 5px'
          }}></div>

          {/* Menu déroulant type */}
          <select 
            value={filtreActif}
            onChange={(e) => setFiltreActif(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '11px',
              backgroundColor: 'white',
              fontWeight: '600'
            }}
          >
            <option value="non_lus">Non lus ({compteurs.non_lus})</option>
            <option value="lus">Lus ({compteurs.lus})</option>
            <option value="validation_planning_a_traiter">Validations planning type à traiter ({compteurs.validation_planning_a_traiter})</option>
            <option value="validation_planning_traitees">Validations planning type traitées ({compteurs.validation_planning_traitees})</option>
            <option value="validation_modif_a_traiter">Validations modification à traiter ({compteurs.validation_modif_a_traiter})</option>
            <option value="validation_modif_traitees">Validations modification traitées ({compteurs.validation_modif_traitees})</option>
            <option value="archives">Archivés ({compteurs.archives})</option>
            <option value="tous">Tous les messages ({compteurs.tous})</option>
          </select>

          {/* Filtre par formateur */}
          <select 
            value={formateurFiltre}
            onChange={(e) => setFormateurFiltre(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '11px',
              backgroundColor: 'white',
              fontWeight: '600'
            }}
          >
            <option value="tous">Tous les formateurs</option>
            {formateurs.map(f => (
              <option key={f.id} value={f.id}>
                {f.prenom} {f.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Deux cadres en dessous */}
      <div style={{
        display: 'flex',
        gap: '20px',
        flex: 1,
        minHeight: '0'
      }}>
        
        {/* Cadre Types de message */}
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '15px',
          display: 'flex',
          flexDirection: 'column',
          height: '500px',
          minHeight: '500px'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#374151',
            paddingBottom: '10px',
            borderBottom: '2px solid #f59e0b',
            flexShrink: 0
          }}>
            Messages récents ({messagesFiltres.length})
          </h3>
          
          <div style={{
            flex: 1,
            overflow: 'auto',
            minHeight: '0',
            paddingRight: '5px',
            marginRight: '-5px'
          }}>
            {messagesFiltres.length === 0 ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                Aucun message dans cette catégorie
              </div>
            ) : (
              messagesFiltres.slice(0, 50).map(message => (
                <div
                  key={message.id}
                  onClick={() => ouvrirMessage(message)}
                  style={{
                    padding: '10px',
                    backgroundColor: selectedMessage?.id === message.id ? '#eff6ff' : 
                                   message.archive ? '#fef3c7' :
                                   message.statut_validation === 'a_traiter' ? (
                                     message.objet === 'Validation de modification ponctuelle' ? '#fed7aa' : '#fee2e2'
                                   ) :
                                   !message.lu ? '#fee2e2' : '#f9fafb',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    border: `1px solid ${selectedMessage?.id === message.id ? '#3b82f6' : 
                                        message.archive ? '#f59e0b' :
                                        message.statut_validation === 'a_traiter' ? (
                                          message.objet === 'Validation de modification ponctuelle' ? '#ea580c' : '#dc2626'
                                        ) :
                                        !message.lu ? '#ef4444' : '#e5e7eb'}`,
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
                    {getTypeMessage(message)} - {message.expediteur_id ? getNomFormateur(message.expediteur_id) : message.destinataire}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    {message.objet || 'Sans objet'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {message.date} {message.heure}
                  </div>
                  {getBadgeStatut(message)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cadre Messages */}
        <div style={{
          flex: 2,
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '15px',
          display: 'flex',
          flexDirection: 'column',
          height: '500px',
          minHeight: '500px'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#374151',
            paddingBottom: '10px',
            borderBottom: '2px solid #f59e0b',
            flexShrink: 0
          }}>
            Lecture du message
          </h3>
          
          {selectedMessage ? (
            <div style={{ 
              flex: 1, 
              overflow: 'auto',
              minHeight: '0',
              paddingRight: '5px',
              marginRight: '-5px'
            }}>
              <div style={{ 
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '15px',
                marginBottom: '15px'
              }}>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  {selectedMessage.objet || 'Sans objet'}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  {selectedMessage.expediteur_id ? 
                    `De: ${getNomFormateur(selectedMessage.expediteur_id)}` : 
                    `À: ${selectedMessage.destinataire}`
                  }
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                  {selectedMessage.date} à {selectedMessage.heure}
                </div>
                
                {/* Actions selon l'état avec bouton Valider */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  
                  {/* Bouton Valider pour demandes planning type */}
                  {estDemandeValidationPlanningType(selectedMessage) && (
                    <button
                      onClick={() => validerPlanningType(selectedMessage)}
                      disabled={validating}
                      style={{
                        padding: '8px 16px',
                        background: validating ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: validating ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {validating ? 'Validation...' : '✅ Valider Planning'}
                    </button>
                  )}

                  {/* ✅ NOUVEAU: Bouton Valider pour demandes modifications ponctuelles */}
                  {estDemandeValidationModifications(selectedMessage) && (
                    <button
                      onClick={() => validerModificationsPonctuelles(selectedMessage)}
                      disabled={validating}
                      style={{
                        padding: '8px 16px',
                        background: validating ? '#9ca3af' : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: validating ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)'
                      }}
                    >
                      {validating ? 'Validation...' : '🔄 Valider Modifications'}
                    </button>
                  )}

                  {/* Actions classiques */}
                  {!selectedMessage.archive && selectedMessage.statut_validation !== 'traite' ? (
                    <button
                      onClick={() => archiverMessage(selectedMessage.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Archiver
                    </button>
                  ) : selectedMessage.archive && (
                    <button
                      onClick={() => supprimerMessage(selectedMessage.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Supprimer définitivement
                    </button>
                  )}
                </div>
              </div>
              
              <div style={{ 
                backgroundColor: '#f9fafb',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '15px',
                lineHeight: '1.5'
              }}>
                {selectedMessage.contenu}
              </div>

              {/* Info statut traité */}
              {selectedMessage.statut_validation === 'traite' && (
                <div style={{
                  padding: '10px',
                  backgroundColor: '#d1fae5',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#065f46',
                  marginBottom: '10px'
                }}>
                  ✅ <strong>Demande traitée</strong> - {selectedMessage.objet === 'Validation de modification ponctuelle' ? 'Les modifications ont été validées' : 'Le planning a été validé'} et archivé automatiquement
                </div>
              )}

              {selectedMessage.archive && (
                <div style={{
                  padding: '10px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#92400e'
                }}>
                  ⚠️ <strong>Message archivé</strong> le {selectedMessage.date_archivage}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              flex: 1,
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              Sélectionnez un message pour l'afficher ici
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessagerieDashboard