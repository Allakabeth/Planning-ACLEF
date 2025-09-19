import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'
import PlanningFormateurType from '../components/assistance/PlanningFormateurType'
import MonPlanningType from '../components/assistance/MonPlanningType'
import Absence from '../components/assistance/Absence'
import MonPlanningHebdo from '../components/assistance/MonPlanningHebdo'

function PriseControleFormateur({ user, logout, inactivityTime }) {
    const router = useRouter()
    const [formateurs, setFormateurs] = useState([])
    const [formateurSelectionne, setFormateurSelectionne] = useState(null)
    const [ongletActif, setOngletActif] = useState('planning-type')
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [isPurging, setIsPurging] = useState(false)
    const [logs, setLogs] = useState([])
    const [isResetting, setIsResetting] = useState(false)
    const [resetMessage, setResetMessage] = useState('')

    // Configuration des onglets
    const onglets = [
        { 
            id: 'planning-type', 
            label: 'Planning Type', 
            description: 'Déclarer le planning type du formateur',
            icon: '📅'
        },
        { 
            id: 'mon-planning-type', 
            label: 'Mon Planning Type', 
            description: 'Voir le planning type validé',
            icon: '✅'
        },
        { 
            id: 'absences', 
            label: 'Absences', 
            description: 'Déclarer les absences/disponibilités exceptionnelles',
            icon: '🚫'
        },
        { 
            id: 'planning-hebdo', 
            label: 'Planning Hebdo', 
            description: 'Voir le planning hebdomadaire du formateur',
            icon: '📊'
        }
    ]

    useEffect(() => {
        chargerFormateurs()
    }, [])

    const chargerFormateurs = async () => {
        try {
            setIsLoading(true)
            
            const { data: formateursData, error } = await supabase
                .from('users')
                .select('id, prenom, nom, email, archive')
                .eq('role', 'formateur')
                .eq('archive', false)
                .order('nom')

            if (error) {
                throw error
            }

            console.log(`✅ ${formateursData?.length || 0} formateurs chargés`)
            setFormateurs(formateursData || [])

        } catch (error) {
            console.error('❌ Erreur chargement formateurs:', error)
            setMessage(`❌ Erreur: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFormateurChange = (formateurId) => {
        const formateur = formateurs.find(f => f.id === formateurId)
        setFormateurSelectionne(formateur)
        setMessage('')
        setLogs([])
        
        if (formateur) {
            console.log(`👤 Formateur sélectionné: ${formateur.prenom} ${formateur.nom}`)
        }
    }

    const handleOngletChange = (ongletId) => {
        setOngletActif(ongletId)
        setMessage('')
        
        const onglet = onglets.find(o => o.id === ongletId)
        console.log(`🔑 Onglet activé: ${onglet?.label}`)
    }

    // ✅ Callbacks pour les composants
    const handleSuccess = (successMessage) => {
        setMessage(successMessage)
        // Auto-clear message après 5 secondes
        setTimeout(() => setMessage(''), 5000)
    }

    const handleError = (errorMessage) => {
        setMessage(errorMessage)
        // Auto-clear message après 5 secondes
        setTimeout(() => setMessage(''), 5000)
    }

    // Fonction d'ajout de logs
    const ajouterLog = (texte) => {
        console.log(texte)
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${texte}`])
    }

    // Fonction de purge complète
    const purgerFormateur = async () => {
        if (!formateurSelectionne) {
            setMessage('⚠️ Aucun formateur sélectionné')
            return
        }

        // Confirmation double sécurité
        if (!confirm(`⚠️ ATTENTION !\n\nVous allez SUPPRIMER DÉFINITIVEMENT toutes les données de :\n\n${formateurSelectionne.prenom} ${formateurSelectionne.nom}\n\n- Planning type\n- Absences déclarées\n- Planning hebdomadaire\n- Messages\n- Références dans planning coordo\n\nCette action est IRRÉVERSIBLE !\n\nÊtes-vous sûr ?`)) {
            return
        }

        setIsPurging(true)
        setMessage('')
        setLogs([])
        ajouterLog(`🧹 DÉBUT PURGE: ${formateurSelectionne.prenom} ${formateurSelectionne.nom}`)

        try {
            let totalSupprime = 0

            // 1️⃣ Planning type
            ajouterLog('1️⃣ Suppression planning type...')
            const { data: planningType, error: errorPT } = await supabase
                .from('planning_type_formateurs')
                .delete()
                .eq('formateur_id', formateurSelectionne.id)
                .select()

            const countPT = planningType?.length || 0
            totalSupprime += countPT
            ajouterLog(`   ✅ ${countPT} planning type supprimés`)
            if (errorPT) ajouterLog(`   ❌ Erreur: ${errorPT.message}`)

            // 2️⃣ Absences
            ajouterLog('2️⃣ Suppression absences...')
            const { data: absences, error: errorAbs } = await supabase
                .from('absences_formateurs')
                .delete()
                .eq('formateur_id', formateurSelectionne.id)
                .select()

            const countAbs = absences?.length || 0
            totalSupprime += countAbs
            ajouterLog(`   ✅ ${countAbs} absences supprimées`)
            if (errorAbs) ajouterLog(`   ❌ Erreur: ${errorAbs.message}`)

            // 3️⃣ Planning hebdo
            ajouterLog('3️⃣ Suppression planning hebdo...')
            const { data: planningHebdo, error: errorPH } = await supabase
                .from('planning_formateurs_hebdo')
                .delete()
                .eq('formateur_id', formateurSelectionne.id)
                .select()

            const countPH = planningHebdo?.length || 0
            totalSupprime += countPH
            ajouterLog(`   ✅ ${countPH} planning hebdo supprimés`)
            if (errorPH) ajouterLog(`   ❌ Erreur: ${errorPH.message}`)

            // 4️⃣ Messages
            ajouterLog('4️⃣ Suppression messages...')
            const { data: messages, error: errorMsg } = await supabase
                .from('messages')
                .delete()
                .eq('expediteur_id', formateurSelectionne.id)
                .select()

            const countMsg = messages?.length || 0
            totalSupprime += countMsg
            ajouterLog(`   ✅ ${countMsg} messages supprimés`)
            if (errorMsg) ajouterLog(`   ❌ Erreur: ${errorMsg.message}`)

            // 5️⃣ Nettoyage planning coordo
            ajouterLog('5️⃣ Nettoyage planning coordo...')
            const { data: planningsCoordoAvec, error: errorSelect } = await supabase
                .from('planning_hebdomadaire')
                .select('*')
                .contains('formateurs_ids', [formateurSelectionne.id])

            let countCoordo = 0
            if (planningsCoordoAvec && planningsCoordoAvec.length > 0) {
                ajouterLog(`   🔍 ${planningsCoordoAvec.length} plannings coordo à nettoyer`)
                
                for (const planning of planningsCoordoAvec) {
                    const nouveauxFormateurs = planning.formateurs_ids.filter(id => id !== formateurSelectionne.id)
                    
                    const { error: errorUpdate } = await supabase
                        .from('planning_hebdomadaire')
                        .update({ formateurs_ids: nouveauxFormateurs })
                        .eq('id', planning.id)
                    
                    if (!errorUpdate) countCoordo++
                }
                ajouterLog(`   ✅ ${countCoordo} plannings coordo nettoyés`)
            } else {
                ajouterLog('   ℹ️ Aucun planning coordo à nettoyer')
            }

            // Résultat final
            ajouterLog('🎉 PURGE TERMINÉE !')
            ajouterLog(`📊 TOTAL: ${totalSupprime} entrées supprimées`)
            setMessage(`✅ ${formateurSelectionne.prenom} ${formateurSelectionne.nom} a été complètement purgé !`)

        } catch (error) {
            console.error('Erreur purge:', error)
            ajouterLog(`💥 ERREUR: ${error.message}`)
            setMessage('❌ Erreur lors de la purge')
        } finally {
            setIsPurging(false)
        }
    }

    // Fonction de réinitialisation mot de passe
    const resetPassword = async () => {
        if (!formateurSelectionne) {
            setResetMessage('⚠️ Aucun formateur sélectionné')
            setTimeout(() => setResetMessage(''), 3000)
            return
        }

        // Confirmation utilisateur
        const confirmReset = confirm(
            `🔄 Réinitialiser le mot de passe de ${formateurSelectionne.prenom} ${formateurSelectionne.nom} ?\n\n` +
            `Le formateur pourra se reconnecter avec son nom de famille : "${formateurSelectionne.nom}"\n\n` +
            `Son mot de passe personnalisé sera supprimé.\n\n` +
            `Confirmer la réinitialisation ?`
        )

        if (!confirmReset) return

        setIsResetting(true)
        setResetMessage('')
        ajouterLog(`🔄 DÉBUT RESET PASSWORD: ${formateurSelectionne.prenom} ${formateurSelectionne.nom}`)

        try {
            // Récupérer le token Supabase de la session admin active
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            if (sessionError || !session?.access_token) {
                throw new Error('Session admin expirée')
            }

            const response = await fetch('/api/admin/reset-formateur-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    formateurId: formateurSelectionne.id,
                    formateurNom: formateurSelectionne.nom
                })
            })

            const data = await response.json()

            if (data.success) {
                setResetMessage(`✅ ${data.message}`)
                ajouterLog(`   ✅ Mot de passe réinitialisé avec succès`)
                ajouterLog(`   🔑 Nouveau mot de passe temporaire: "${data.fallbackPassword}"`)
                
                // Auto-clear message après 10 secondes
                setTimeout(() => setResetMessage(''), 10000)
            } else {
                throw new Error(data.error || 'Erreur inconnue')
            }
        } catch (error) {
            console.error('Erreur reset password:', error)
            const errorMsg = `❌ Erreur: ${error.message}`
            setResetMessage(errorMsg)
            ajouterLog(`   ❌ ERREUR: ${error.message}`)
            
            // Auto-clear error après 8 secondes
            setTimeout(() => setResetMessage(''), 8000)
        } finally {
            setIsResetting(false)
        }
    }

    // ✅ NOUVEAU: Rendu du contenu selon l'onglet actif
    const renderContenuOnglet = () => {
        if (!formateurSelectionne) {
            return (
                <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '2px dashed #cbd5e1'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
                    <h3 style={{ 
                        fontSize: '18px', 
                        color: '#475569',
                        margin: '0 0 8px 0'
                    }}>
                        Sélectionnez un formateur
                    </h3>
                    <p style={{ 
                        fontSize: '14px', 
                        color: '#64748b',
                        margin: '0'
                    }}>
                        Choisissez le formateur pour lequel vous souhaitez effectuer des actions
                    </p>
                </div>
            )
        }

        // ✅ RENDU CONDITIONNEL SELON ONGLET - TOUS LES COMPOSANTS INTÉGRÉS
        switch (ongletActif) {
            case 'planning-type':
                return (
                    <PlanningFormateurType
                        formateurId={formateurSelectionne.id}
                        formateurData={formateurSelectionne}
                        onSuccess={handleSuccess}
                        onError={handleError}
                    />
                )
                
            case 'mon-planning-type':
                return (
                    <MonPlanningType
                        formateurId={formateurSelectionne.id}
                        formateurData={formateurSelectionne}
                        onError={handleError}
                    />
                )
                
            case 'absences':
                return (
                    <Absence
                        formateurId={formateurSelectionne.id}
                        formateurData={formateurSelectionne}
                        onSuccess={handleSuccess}
                        onError={handleError}
                    />
                )
                
            case 'planning-hebdo':
                return (
                    <MonPlanningHebdo
                        formateurId={formateurSelectionne.id}
                        formateurData={formateurSelectionne}
                        onError={handleError}
                    />
                )
                
            default:
                return null
        }
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '40px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement des formateurs...</div>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            padding: '20px'
        }}>
            {/* Header avec navigation */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: '15px 25px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
                <nav style={{ fontSize: '14px' }}>
                    <span style={{ color: '#6b7280' }}>Dashboard</span>
                    <span style={{ margin: '0 10px', color: '#9ca3af' }}>/</span>
                    <span style={{ color: '#8b5cf6', fontWeight: '500' }}>Prise Contrôle Formateur</span>
                </nav>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        Accueil
                    </button>

                    {/* Badge de statut avec compte à rebours */}
                    <div style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        backgroundColor: inactivityTime >= 240 ? '#fee2e2' : inactivityTime >= 180 ? '#fef3c7' : '#d1fae5',
                        color: inactivityTime >= 240 ? '#dc2626' : inactivityTime >= 180 ? '#f59e0b' : '#10b981',
                        border: '1px solid',
                        borderColor: inactivityTime >= 240 ? '#fecaca' : inactivityTime >= 180 ? '#fde68a' : '#bbf7d0'
                    }}>
                        Status : {inactivityTime >= 300 ? '😴 ENDORMI!' : 
                                 inactivityTime >= 240 ? `⚠️ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
                                 inactivityTime >= 180 ? `⏰ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
                                 `🟢 ACTIF`}
                    </div>
                    
                    {/* Bouton déconnexion */}
                    <button
                        onClick={logout}
                        style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        🚪 Déconnexion
                    </button>
                </div>
            </div>


            {/* Messages */}
            {message && (
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto 20px auto',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: message.includes('❌') ? '#fee2e2' : '#d1fae5',
                    color: message.includes('❌') ? '#991b1b' : '#065f46',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    {message}
                </div>
            )}

            {/* Contenu principal */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                gap: '20px'
            }}>
                
                {/* Colonne gauche - Sélection et navigation */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    height: 'fit-content',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                    
                    {/* Sélection formateur */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#374151',
                            marginBottom: '8px'
                        }}>
                            👤 Sélectionner un formateur
                        </label>
                        <select
                            value={formateurSelectionne?.id || ''}
                            onChange={(e) => handleFormateurChange(e.target.value)}
                            disabled={isPurging}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '14px',
                                backgroundColor: isPurging ? '#f9fafb' : 'white',
                                cursor: isPurging ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <option value="">-- Choisir un formateur --</option>
                            {formateurs.map(formateur => (
                                <option key={formateur.id} value={formateur.id}>
                                    {formateur.prenom} {formateur.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Informations formateur sélectionné */}
                    {formateurSelectionne && (
                        <div style={{
                            backgroundColor: '#f0f9ff',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '24px',
                            border: '2px solid #3b82f6'
                        }}>
                            <h4 style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#1e40af',
                                margin: '0 0 8px 0'
                            }}>
                                Formateur sélectionné
                            </h4>
                            <div style={{ fontSize: '13px', color: '#1e40af' }}>
                                <div><strong>{formateurSelectionne.prenom} {formateurSelectionne.nom}</strong></div>
                                {formateurSelectionne.email && (
                                    <div style={{ marginTop: '4px' }}>{formateurSelectionne.email}</div>
                                )}
                                <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.8 }}>
                                    ID: {formateurSelectionne.id.substring(0, 8)}...
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation onglets */}
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#374151',
                            margin: '0 0 12px 0'
                        }}>
                            🔑 Actions disponibles
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {onglets.map(onglet => (
                                <button
                                    key={onglet.id}
                                    onClick={() => handleOngletChange(onglet.id)}
                                    disabled={!formateurSelectionne || isPurging}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: ongletActif === onglet.id ? '#3b82f6' : 
                                                        (!formateurSelectionne || isPurging) ? '#f3f4f6' : '#e5e7eb',
                                        color: ongletActif === onglet.id ? 'white' : 
                                               (!formateurSelectionne || isPurging) ? '#9ca3af' : '#374151',
                                        cursor: (!formateurSelectionne || isPurging) ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        textAlign: 'left',
                                        transition: 'all 0.2s',
                                        opacity: (!formateurSelectionne || isPurging) ? 0.6 : 1
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>{onglet.icon}</span>
                                        <span>{onglet.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bouton Purge */}
                    <div style={{ marginBottom: '24px' }}>
                        <button
                            onClick={purgerFormateur}
                            disabled={!formateurSelectionne || isPurging}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: (!formateurSelectionne || isPurging) ? '#f3f4f6' : '#dc2626',
                                color: (!formateurSelectionne || isPurging) ? '#9ca3af' : 'white',
                                cursor: (!formateurSelectionne || isPurging) ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                opacity: (!formateurSelectionne || isPurging) ? 0.6 : 1
                            }}
                        >
                            {isPurging ? '🧹 Purge en cours...' : '🗑️ PURGER PLANNING'}
                        </button>
                        {formateurSelectionne && (
                            <div style={{
                                marginTop: '8px',
                                fontSize: '11px',
                                color: '#dc2626',
                                textAlign: 'center',
                                lineHeight: '1.3'
                            }}>
                                ⚠️ Supprime définitivement toutes les données planning
                            </div>
                        )}
                    </div>

                    {/* Bouton Reset Password */}
                    <div style={{ marginBottom: '24px' }}>
                        <button
                            onClick={resetPassword}
                            disabled={!formateurSelectionne || isResetting || isPurging}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: (!formateurSelectionne || isResetting || isPurging) ? '#f3f4f6' : '#f59e0b',
                                color: (!formateurSelectionne || isResetting || isPurging) ? '#9ca3af' : 'white',
                                cursor: (!formateurSelectionne || isResetting || isPurging) ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                opacity: (!formateurSelectionne || isResetting || isPurging) ? 0.6 : 1
                            }}
                        >
                            {isResetting ? '🔄 Réinitialisation...' : '🔑 RÉINITIALISER MOT DE PASSE'}
                        </button>
                        {formateurSelectionne && (
                            <div style={{
                                marginTop: '8px',
                                fontSize: '11px',
                                color: '#f59e0b',
                                textAlign: 'center',
                                lineHeight: '1.3'
                            }}>
                                🔑 Le formateur pourra se reconnecter avec : "{formateurSelectionne.nom}"
                            </div>
                        )}
                        
                        {/* Message de feedback pour reset */}
                        {resetMessage && (
                            <div style={{
                                marginTop: '8px',
                                padding: '8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                textAlign: 'center',
                                backgroundColor: resetMessage.includes('✅') ? '#d1fae5' : '#fee2e2',
                                color: resetMessage.includes('✅') ? '#065f46' : '#991b1b',
                                border: '1px solid',
                                borderColor: resetMessage.includes('✅') ? '#bbf7d0' : '#fecaca'
                            }}>
                                {resetMessage}
                            </div>
                        )}
                    </div>

                    {/* Compteur formateurs */}
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#6b7280',
                        textAlign: 'center'
                    }}>
                        📊 {formateurs.length} formateur{formateurs.length > 1 ? 's' : ''} disponible{formateurs.length > 1 ? 's' : ''}
                    </div>
                </div>

                {/* Colonne droite - Contenu */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    minHeight: '600px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                    {renderContenuOnglet()}
                    
                    {/* Logs de purge */}
                    {logs.length > 0 && (
                        <div style={{
                            marginTop: '20px',
                            backgroundColor: '#1f2937',
                            color: '#f9fafb',
                            padding: '15px',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginBottom: '10px',
                                color: '#fbbf24'
                            }}>
                                📋 Logs de purge :
                            </div>
                            {logs.map((log, index) => (
                                <div key={index} style={{ marginBottom: '2px' }}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                maxWidth: '1200px',
                margin: '20px auto 0 auto',
                textAlign: 'center',
                fontSize: '12px',
                color: '#9ca3af'
            }}>
                Interface d'assistance - ACLEF Planning v8.0
            </div>
        </div>
    )
}

// 🛡️ PROTECTION AVEC HOC - Page titre personnalisé
export default withAuthAdmin(PriseControleFormateur, "Assistance Formateur")