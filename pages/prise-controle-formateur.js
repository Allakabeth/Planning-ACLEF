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
    const [absencesEnAttente, setAbsencesEnAttente] = useState([])
    const [isValidating, setIsValidating] = useState(false)

    // ✅ FONCTION: Convertir date ISO → format français
    const formatDateFr = (dateISO) => {
        if (!dateISO) return ''
        const [year, month, day] = dateISO.split('-')
        return `${day}-${month}-${year}`
    }

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

    const chargerAbsencesEnAttente = async (formateurId) => {
        try {
            const { data, error } = await supabase
                .from('absences_formateurs')
                .select('*')
                .eq('formateur_id', formateurId)
                .eq('statut', 'en_attente')
                .order('created_at', { ascending: false })

            if (error) throw error

            setAbsencesEnAttente(data || [])
            console.log(`📋 ${data?.length || 0} absences en attente pour ce formateur`)
        } catch (error) {
            console.error('Erreur chargement absences:', error)
        }
    }

    const handleFormateurChange = (formateurId) => {
        const formateur = formateurs.find(f => f.id === formateurId)
        setFormateurSelectionne(formateur)
        setMessage('')
        setLogs([])
        setAbsencesEnAttente([])

        if (formateur) {
            console.log(`👤 Formateur sélectionné: ${formateur.prenom} ${formateur.nom}`)
            chargerAbsencesEnAttente(formateur.id)
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
        // Recharger les absences en attente
        if (formateurSelectionne) {
            chargerAbsencesEnAttente(formateurSelectionne.id)
        }
        // Auto-clear message après 5 secondes
        setTimeout(() => setMessage(''), 5000)
    }

    const handleError = (errorMessage) => {
        setMessage(errorMessage)
        // Auto-clear message après 5 secondes
        setTimeout(() => setMessage(''), 5000)
    }

    // 👑 FONCTION ROI - COMMUNICATION AVEC SYSTÈMES (copié de valider-changements.js)
    const commanderSystemes = (action, formateurId, dateStr, details = {}) => {
        const commande = {
            action,
            formateur_id: formateurId,
            date: dateStr,
            timestamp: Date.now(),
            details,
            roi: 'prise_controle_formateur'
        }

        console.log('👑 ROI COMMANDE:', commande)

        localStorage.setItem('roiCommande', JSON.stringify(commande))

        setTimeout(() => {
            const currentCommande = localStorage.getItem('roiCommande')
            if (currentCommande) {
                const parsed = JSON.parse(currentCommande)
                if (parsed.timestamp === commande.timestamp) {
                    localStorage.removeItem('roiCommande')
                    console.log('🧹 Commande ROI nettoyée automatiquement')
                }
            }
        }, 5000)

        return commande
    }

    // 👑 FONCTION ROI - NETTOYAGE AFFECTATIONS (copié de valider-changements.js)
    const nettoyerAffectations = async (formateurId, dateStr, creneau = null) => {
        console.log(`🧹 ROI NETTOIE : ${formateurId} le ${dateStr} ${creneau || 'tous créneaux'}`)

        let affectationsNettoyees = 0
        let casesModifiees = 0

        try {
            // 1. NETTOYER planning_hebdomadaire
            let query = supabase
                .from('planning_hebdomadaire')
                .select('*')
                .eq('date', dateStr)

            if (creneau) {
                const creneauDB = creneau === 'Matin' ? 'matin' : 'AM'
                query = query.eq('creneau', creneauDB)
            }

            const { data: plannings, error: planningsError } = await query

            if (planningsError) throw planningsError

            for (let planning of plannings || []) {
                if (planning.formateurs_ids && planning.formateurs_ids.includes(formateurId)) {
                    const nouveauxFormateurs = planning.formateurs_ids.filter(id => id !== formateurId)

                    const { error: updateError } = await supabase
                        .from('planning_hebdomadaire')
                        .update({ formateurs_ids: nouveauxFormateurs })
                        .eq('id', planning.id)

                    if (updateError) throw updateError

                    casesModifiees++
                    console.log(`✅ Retiré de planning_hebdomadaire case ${planning.jour} ${planning.creneau}`)
                }
            }

            // 2. NETTOYER planning_formateurs_hebdo
            let deleteQuery = supabase
                .from('planning_formateurs_hebdo')
                .delete()
                .eq('formateur_id', formateurId)
                .eq('date', dateStr)

            if (creneau) {
                const creneauDB = creneau === 'Matin' ? 'matin' : 'AM'
                deleteQuery = deleteQuery.eq('creneau', creneauDB)
            }

            const { data: deleted, error: deleteError } = await deleteQuery.select()

            if (deleteError) throw deleteError

            affectationsNettoyees = deleted?.length || 0
            console.log(`✅ Supprimé ${affectationsNettoyees} affectations planning_formateurs_hebdo`)

            return {
                affectationsNettoyees,
                casesModifiees,
                success: true
            }

        } catch (error) {
            console.error('❌ Erreur nettoyage affectations:', error)
            throw new Error(`Erreur nettoyage: ${error.message}`)
        }
    }

    // 👑 FONCTION ROI - MESSAGES AUTOMATIQUES (copié de valider-changements.js)
    const envoyerConfirmationFormateur = async (formateur, absence, action) => {
        try {
            let contenu = ''
            let objet = ''

            switch(action) {
                case 'validee':
                    objet = `Absence validée - ${formatDateFr(absence.date_debut)}`
                    contenu = `Bonjour ${formateur.prenom},\n\nVotre demande d'absence du ${formatDateFr(absence.date_debut)} au ${formatDateFr(absence.date_fin)} a été validée par le coordinateur.\n\nType: ${absence.type}\nVotre planning a été mis à jour automatiquement.\n\nCordialement,\nL'équipe ACLEF`
                    break
                case 'supprimee':
                    objet = `Absence supprimée - ${formatDateFr(absence.date_debut)}`
                    contenu = `Bonjour ${formateur.prenom},\n\nVotre absence du ${formatDateFr(absence.date_debut)} au ${formatDateFr(absence.date_fin)} a été supprimée.\n\nVous redevenez disponible selon votre planning type habituel.\n\nCordialement,\nL'équipe ACLEF`
                    break
                default:
                    throw new Error(`Action message inconnue: ${action}`)
            }

            const { error } = await supabase.from('messages').insert({
                expediteur: 'Coordination ACLEF',
                destinataire_id: formateur.id,
                objet: objet,
                contenu: contenu,
                type: 'planning'
            })

            if (error) throw error

            console.log(`📧 Message ${action} envoyé à ${formateur.prenom}`)
            return true

        } catch (error) {
            console.error('❌ Erreur envoi message:', error)
            throw new Error(`Erreur message: ${error.message}`)
        }
    }

    // 👑 FONCTION VALIDATION ABSENCE DIRECTE
    const validerAbsence = async (absenceId) => {
        try {
            setIsValidating(true)
            setMessage('Validation en cours...')

            // 1. Récupérer absence
            const { data: absence, error: absenceError } = await supabase
                .from('absences_formateurs')
                .select('*')
                .eq('id', absenceId)
                .single()

            if (absenceError) throw absenceError
            if (!absence) throw new Error('Absence non trouvée')

            // 2. Valider = passer à 'validé'
            const { error: updateError } = await supabase
                .from('absences_formateurs')
                .update({ statut: 'validé' })
                .eq('id', absenceId)

            if (updateError) throw updateError

            // 3. 👑 NETTOYAGE ROI si absence (pas si dispo exceptionnelle)
            if (absence.type !== 'formation') {
                await nettoyerAffectations(absence.formateur_id, absence.date_debut)

                // 4. 👑 COMMANDER au coordo de retirer le formateur
                commanderSystemes('retirer_formateur', absence.formateur_id, absence.date_debut, {
                    type: absence.type,
                    date_fin: absence.date_fin,
                    motif: absence.motif
                })
            } else {
                // Dispo exceptionnelle -> Commander d'ajouter
                commanderSystemes('ajouter_formateur', absence.formateur_id, absence.date_debut, {
                    type: 'dispo_except',
                    date_fin: absence.date_fin,
                    motif: absence.motif
                })
            }

            // 5. 👑 ENVOYER MESSAGE AU FORMATEUR
            if (formateurSelectionne) {
                await envoyerConfirmationFormateur(formateurSelectionne, absence, 'validee')
            }

            setMessage(`✅ Absence validée avec succès ! 📧 Message envoyé au formateur`)

            // 6. Recharger les absences en attente
            if (formateurSelectionne) {
                await chargerAbsencesEnAttente(formateurSelectionne.id)
            }

        } catch (error) {
            console.error('❌ Erreur validation:', error)
            setMessage(`❌ Erreur: ${error.message}`)
        } finally {
            setIsValidating(false)
            setTimeout(() => setMessage(''), 5000)
        }
    }

    // 👑 FONCTION SUPPRESSION ABSENCE DIRECTE
    const supprimerAbsence = async (absenceId) => {
        if (!confirm('Supprimer définitivement cette absence ?')) return

        try {
            setIsValidating(true)
            setMessage('Suppression en cours...')

            // 1. Récupérer absence
            const { data: absence, error: absenceError } = await supabase
                .from('absences_formateurs')
                .select('*')
                .eq('id', absenceId)
                .single()

            if (absenceError) throw absenceError
            if (!absence) throw new Error('Absence non trouvée')

            // 2. Supprimer
            const { error: deleteError } = await supabase
                .from('absences_formateurs')
                .delete()
                .eq('id', absenceId)

            if (deleteError) throw deleteError

            // 3. Nettoyage affectations
            await nettoyerAffectations(absence.formateur_id, absence.date_debut)

            // 4. Commander au coordo de remettre formateur disponible
            commanderSystemes('remettre_disponible', absence.formateur_id, absence.date_debut, {
                type: absence.type,
                date_fin: absence.date_fin,
                motif: absence.motif,
                action: 'suppression'
            })

            // 5. Envoyer message au formateur
            if (formateurSelectionne) {
                await envoyerConfirmationFormateur(formateurSelectionne, absence, 'supprimee')
            }

            setMessage(`✅ Absence supprimée ! 📧 Message envoyé au formateur`)

            // 6. Recharger les absences en attente
            if (formateurSelectionne) {
                await chargerAbsencesEnAttente(formateurSelectionne.id)
            }

        } catch (error) {
            console.error('❌ Erreur suppression:', error)
            setMessage(`❌ Erreur: ${error.message}`)
        } finally {
            setIsValidating(false)
            setTimeout(() => setMessage(''), 5000)
        }
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
                    <>
                        <Absence
                            formateurId={formateurSelectionne.id}
                            formateurData={formateurSelectionne}
                            onSuccess={handleSuccess}
                            onError={handleError}
                        />

                        {/* Section Absences en attente - Validation rapide */}
                        {absencesEnAttente.length > 0 && (
                            <div style={{
                                marginTop: '30px',
                                padding: '20px',
                                backgroundColor: '#fef3c7',
                                borderRadius: '12px',
                                border: '2px solid #f59e0b'
                            }}>
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: '#92400e',
                                    margin: '0 0 16px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>⚠️</span>
                                    <span>{absencesEnAttente.length} absence{absencesEnAttente.length > 1 ? 's' : ''} en attente de validation</span>
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {absencesEnAttente.map(absence => {
                                        const getTypeDetails = (type) => {
                                            switch (type) {
                                                case 'personnel':
                                                    return { label: 'Absence', couleur: '#ef4444' }
                                                case 'formation':
                                                    return { label: 'Dispo exceptionnelle', couleur: '#f59e0b' }
                                                case 'maladie':
                                                    return { label: 'Maladie', couleur: '#dc2626' }
                                                case 'congés':
                                                    return { label: 'Congés', couleur: '#059669' }
                                                default:
                                                    return { label: 'Autre', couleur: '#6b7280' }
                                            }
                                        }

                                        const typeDetails = getTypeDetails(absence.type)
                                        const estPeriode = absence.date_debut !== absence.date_fin

                                        return (
                                            <div key={absence.id} style={{
                                                backgroundColor: 'white',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '16px',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        marginBottom: '8px'
                                                    }}>
                                                        <span style={{
                                                            backgroundColor: typeDetails.couleur,
                                                            color: 'white',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {typeDetails.label}
                                                        </span>
                                                    </div>

                                                    <div style={{
                                                        fontSize: '15px',
                                                        fontWeight: '600',
                                                        color: '#1f2937',
                                                        marginBottom: '4px'
                                                    }}>
                                                        {new Date(absence.date_debut).toLocaleDateString('fr-FR')}
                                                        {estPeriode && (
                                                            <span> → {new Date(absence.date_fin).toLocaleDateString('fr-FR')}</span>
                                                        )}
                                                    </div>

                                                    {absence.motif && (
                                                        <div style={{
                                                            fontSize: '13px',
                                                            color: '#6b7280',
                                                            fontStyle: 'italic'
                                                        }}>
                                                            "{absence.motif}"
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{
                                                    display: 'flex',
                                                    gap: '8px'
                                                }}>
                                                    <button
                                                        onClick={() => validerAbsence(absence.id)}
                                                        disabled={isValidating}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '10px 16px',
                                                            borderRadius: '8px',
                                                            fontWeight: '600',
                                                            fontSize: '13px',
                                                            cursor: isValidating ? 'not-allowed' : 'pointer',
                                                            opacity: isValidating ? 0.6 : 1,
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        ✅ Valider
                                                    </button>
                                                    <button
                                                        onClick={() => supprimerAbsence(absence.id)}
                                                        disabled={isValidating}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '10px 16px',
                                                            borderRadius: '8px',
                                                            fontWeight: '600',
                                                            fontSize: '13px',
                                                            cursor: isValidating ? 'not-allowed' : 'pointer',
                                                            opacity: isValidating ? 0.6 : 1,
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        🗑️ Supprimer
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div style={{
                                    marginTop: '12px',
                                    fontSize: '12px',
                                    color: '#78350f',
                                    textAlign: 'center'
                                }}>
                                    💡 Valider une absence retire automatiquement le formateur du planning et lui envoie un message
                                </div>
                            </div>
                        )}
                    </>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{onglet.icon}</span>
                                            <span>{onglet.label}</span>
                                        </div>
                                        {/* Badge pour les absences en attente */}
                                        {onglet.id === 'absences' && absencesEnAttente.length > 0 && (
                                            <span style={{
                                                backgroundColor: ongletActif === onglet.id ? 'rgba(255,255,255,0.3)' : '#f59e0b',
                                                color: ongletActif === onglet.id ? 'white' : 'white',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            }}>
                                                {absencesEnAttente.length}
                                            </span>
                                        )}
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