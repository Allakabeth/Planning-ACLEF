import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function PlanningTypeFormateurs({ user, logout, inactivityTime }) {
    const router = useRouter()
    
    // États
    const [formateurs, setFormateurs] = useState([])
    const [lieux, setLieux] = useState([])
    const [formateurSelectionne, setFormateurSelectionne] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [planningData, setPlanningData] = useState({})
    
    // Configuration des jours et créneaux - ✅ AM au lieu d'Après-midi
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
    const creneaux = ['Matin', 'AM']
    
    // Configuration des statuts
    const statuts = [
        { key: 'disponible', label: 'Disponible', couleur: '#10b981' },
        { key: 'dispo_except', label: 'Dispo except.', couleur: '#f59e0b' },
        { key: 'indisponible', label: 'Indisponible', couleur: '#6b7280' }
    ]

    // Charger les données depuis la BDD
    useEffect(() => {
        loadFormateurs()
        loadLieux()
        initializePlanning()
    }, [])

    // ✅ NOUVEAU: Pré-sélection formateur depuis URL
    useEffect(() => {
        if (formateurs.length > 0) {
            const params = new URLSearchParams(window.location.search)
            const formateurUrl = params.get('formateur')
            if (formateurUrl && formateurs.find(f => f.id === formateurUrl)) {
                console.log('✅ Pré-sélection formateur depuis URL:', formateurUrl)
                setFormateurSelectionne(formateurUrl)
                handleFormateurChange(formateurUrl)
            }
        }
    }, [formateurs])

    const loadFormateurs = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, prenom, nom')
                .eq('role', 'formateur')
                .eq('archive', false)
                .order('nom')

            if (error) {
                console.error('Erreur chargement formateurs:', error)
                setMessage('Erreur lors du chargement des formateurs')
            } else {
                setFormateurs(data || [])
            }
        } catch (error) {
            console.error('Erreur:', error)
            setMessage('Erreur de connexion à la base de données')
        }
    }

    const loadLieux = async () => {
        try {
            const { data, error } = await supabase
                .from('lieux')
                .select('id, nom, initiale, couleur')
                .eq('archive', false)
                .order('nom')

            if (error) {
                console.error('Erreur chargement lieux:', error)
                setMessage('Erreur lors du chargement des lieux')
            } else {
                setLieux(data || [])
            }
        } catch (error) {
            console.error('Erreur:', error)
            setMessage('Erreur de connexion à la base de données')
        }
    }

    const initializePlanning = () => {
        const newPlanning = {}
        jours.forEach((jour, dayIndex) => {
            creneaux.forEach((creneau) => {
                const key = `${dayIndex}-${creneau}`
                newPlanning[key] = {
                    statut: 'indisponible',
                    lieu: null,
                    valide: false,
                    sansPreference: false
                }
            })
        })
        setPlanningData(newPlanning)
    }

    const handleFormateurChange = async (formateurId) => {
        setFormateurSelectionne(formateurId)
        setIsLoading(true)
        
        if (formateurId) {
            await loadPlanningFormateur(formateurId)
        } else {
            initializePlanning()
        }
        
        setIsLoading(false)
    }

    const loadPlanningFormateur = async (formateurId) => {
        try {
            const { data, error } = await supabase
                .from('planning_type_formateurs')
                .select(`
                    id,
                    jour,
                    creneau,
                    statut,
                    lieu_id,
                    valide,
                    lieux:lieu_id (
                        id,
                        nom,
                        initiale,
                        couleur
                    )
                `)
                .eq('formateur_id', formateurId)

            if (error) {
                console.error('Erreur chargement planning:', error)
                setMessage('Erreur lors du chargement du planning')
                initializePlanning()
                return
            }

            const newPlanning = {}
            
            // Initialiser tous les créneaux comme indisponibles
            jours.forEach((jour, dayIndex) => {
                creneaux.forEach((creneau) => {
                    const key = `${dayIndex}-${creneau}`
                    newPlanning[key] = {
                        statut: 'indisponible',
                        lieu: null,
                        valide: false,
                        sansPreference: false
                    }
                })
            })

            // Remplir avec les données existantes
            if (data && data.length > 0) {
                data.forEach(item => {
                    const dayIndex = jours.indexOf(item.jour)
                    if (dayIndex !== -1) {
                        const key = `${dayIndex}-${item.creneau}`
                        newPlanning[key] = {
                            statut: item.statut,
                            lieu: item.lieux,
                            valide: item.valide || false,
                            // ✅ NOUVEAU: Détecter "sans préférence" si lieu_id est null mais statut disponible
                            sansPreference: item.lieu_id === null && item.statut !== 'indisponible'
                        }
                    }
                })
                setMessage(`Planning chargé : ${data.length} créneaux déclarés par ${getFormateurNom()}`)
            } else {
                setMessage(`Aucun planning type déclaré par ${getFormateurNom()}`)
            }

            setPlanningData(newPlanning)

        } catch (error) {
            console.error('Erreur:', error)
            setMessage('Erreur lors du chargement du planning')
            initializePlanning()
        }
    }

    const toggleValidation = (dayIndex, creneau) => {
        const key = `${dayIndex}-${creneau}`
        setPlanningData(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                valide: !prev[key].valide
            }
        }))
    }

    const validerTout = () => {
        setPlanningData(prev => {
            const newData = {...prev}
            Object.keys(newData).forEach(key => {
                if (newData[key].statut !== 'indisponible') {
                    newData[key].valide = true
                }
            })
            return newData
        })
    }

    const devaliderTout = () => {
        setPlanningData(prev => {
            const newData = {...prev}
            Object.keys(newData).forEach(key => {
                newData[key].valide = false
            })
            return newData
        })
    }

    const getStats = () => {
        const creneauxDeclares = Object.values(planningData).filter(d => d.statut !== 'indisponible').length
        const creneauxValides = Object.values(planningData).filter(d => d.valide === true).length
        return { creneauxDeclares, creneauxValides }
    }

    const getCouleurStatut = (statut) => {
        const statutObj = statuts.find(s => s.key === statut)
        return statutObj ? statutObj.couleur : '#6b7280'
    }

    const getFormateurNom = () => {
        const formateur = formateurs.find(f => f.id === formateurSelectionne)
        return formateur ? `${formateur.prenom} ${formateur.nom}` : ''
    }

    // ✅ NOUVEAU: Fonction d'envoi de message automatique
    const envoyerMessageFormateur = async (formateurId, stats) => {
        try {
            const formateur = formateurs.find(f => f.id === formateurId)
            if (!formateur) {
                console.error('Formateur non trouvé pour envoi message')
                return
            }

            const formateurNom = `${formateur.prenom} ${formateur.nom}`
            
            const { error } = await supabase
                .from('messages')
                .insert({
                    expediteur_id: null, // null = admin
                    destinataire_id: formateurId,
                    expediteur: 'Coordination ACLEF',
                    destinataire: formateurNom,
                    objet: 'Planning type validé',
                    contenu: `Bonjour ${formateur.prenom},

Votre planning type a été validé avec succès !

📋 Résumé de la validation :
• ${stats.creneauxValides} créneaux validés sur ${stats.creneauxDeclares} déclarés
• Votre planning est maintenant disponible dans le système de coordination

Vous pouvez consulter votre planning type validé dans votre interface formateur, section "Mon planning type".

Merci pour votre collaboration !

L'équipe de coordination ACLEF`,
                    type: 'planning',
                    lu: false,
                    archive: false,
                    statut_validation: 'valide',
                    date: new Date().toISOString().split('T')[0],
                    heure: new Date().toTimeString().slice(0, 5)
                })

            if (error) {
                console.error('Erreur envoi message automatique:', error)
                // Ne pas faire échouer la validation pour un problème de message
            } else {
                console.log('✅ Message automatique envoyé à ', formateurNom)
            }

        } catch (error) {
            console.error('Erreur:', error)
            // Ne pas faire échouer la validation pour un problème de message
        }
    }

    const handleValiderTransmettre = async () => {
        if (!formateurSelectionne) {
            setMessage('Aucun formateur sélectionné')
            return
        }

        setIsLoading(true)
        setMessage('Sauvegarde des validations en cours...')

        try {
            // Préparer les mises à jour pour chaque créneau
            const updates = []
            
            Object.keys(planningData).forEach((key) => {
                const [dayIndex, creneau] = key.split('-')
                const jour = jours[parseInt(dayIndex)]
                const cellData = planningData[key]
                
                if (cellData.statut !== 'indisponible') {
                    updates.push({
                        formateur_id: formateurSelectionne,
                        jour: jour,
                        creneau: creneau,
                        valide: cellData.valide,
                        valide_par: cellData.valide ? 'Admin' : null,
                        date_validation: cellData.valide ? new Date().toISOString() : null
                    })
                }
            })

            // Mettre à jour chaque créneau individuellement
            for (const update of updates) {
                const { error } = await supabase
                    .from('planning_type_formateurs')
                    .update({
                        valide: update.valide,
                        valide_par: update.valide_par,
                        date_validation: update.date_validation,
                        updated_at: new Date().toISOString()
                    })
                    .eq('formateur_id', update.formateur_id)
                    .eq('jour', update.jour)
                    .eq('creneau', update.creneau)

                if (error) {
                    throw new Error(`Erreur mise à jour ${update.jour} ${update.creneau}: ${error.message}`)
                }
            }

            const stats = getStats()
            const formateurNom = getFormateurNom()
            
            // ✅ NOUVEAU: Envoyer message automatique au formateur
            await envoyerMessageFormateur(formateurSelectionne, stats)
            
            setMessage(`✅ Planning validé et transmis ! ${stats.creneauxValides} créneau(x) validé(s) sur ${stats.creneauxDeclares} pour ${formateurNom}. Les données sont maintenant disponibles dans le planning coordinateur. Message de confirmation envoyé au formateur.`)

        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            setMessage(`❌ Erreur lors de la validation : ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 60px'
        }}>
            {/* Header avec navigation */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: '8px 20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backdropFilter: 'blur(10px)'
            }}>
                <nav style={{ fontSize: '14px' }}>
                    <span style={{ color: '#6b7280' }}>Dashboard</span>
                    <span style={{ margin: '0 10px', color: '#9ca3af' }}>/</span>
                    <span style={{ color: '#8b5cf6', fontWeight: '500' }}>Planning Type Formateurs</span>
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

                    {/* Status avec compte à rebours + Déconnexion */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            </div>

            {/* Titre principal */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '10px'
                }}>
                    Planning Type Formateurs
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Consultez et validez les déclarations de planning type des formateurs
                </p>
            </div>

            {/* Message de notification */}
            {message && (
                <div style={{
                    backgroundColor: message.includes('✅') ? '#d1fae5' : message.includes('❌') ? '#fee2e2' : '#dbeafe',
                    color: message.includes('✅') ? '#065f46' : message.includes('❌') ? '#991b1b' : '#1e40af',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontWeight: '500'
                }}>
                    {message}
                </div>
            )}

            {/* Sélection du formateur */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <label style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#374151',
                        minWidth: '200px'
                    }}>
                        Sélectionner un formateur :
                    </label>
                    <select
                        value={formateurSelectionne}
                        onChange={(e) => handleFormateurChange(e.target.value)}
                        style={{
                            flex: 1,
                            minWidth: '300px',
                            padding: '12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">-- Choisir un formateur --</option>
                        {formateurs.map((formateur) => (
                            <option key={formateur.id} value={formateur.id}>
                                {formateur.prenom} {formateur.nom}
                            </option>
                        ))}
                    </select>
                    
                    {formateurSelectionne && (
                        <button
                            onClick={handleValiderTransmettre}
                            disabled={isLoading}
                            style={{
                                padding: '12px 24px',
                                background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => !isLoading && (e.target.style.transform = 'translateY(-2px)')}
                            onMouseOut={(e) => !isLoading && (e.target.style.transform = 'translateY(0)')}
                        >
                            {isLoading ? 'SAUVEGARDE...' : 'VALIDER & TRANSMETTRE'}
                        </button>
                    )}
                </div>
            </div>

            {/* Légende des statuts */}
            {formateurSelectionne && (
                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#374151', 
                        marginBottom: '15px' 
                    }}>
                        Légende des statuts :
                    </h3>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                        gap: '15px' 
                    }}>
                        {statuts.map(statut => (
                            <div key={statut.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: statut.couleur,
                                    borderRadius: '6px',
                                    border: '2px solid white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}></div>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {statut.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        marginTop: '15px',
                        padding: '15px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                        <p style={{ fontSize: '14px', color: '#1d4ed8', margin: 0 }}>
                            <strong>💡 Processus :</strong> Consultez les déclarations, validez les créneaux souhaités, puis transmettez le planning validé au formateur.
                        </p>
                    </div>
                </div>
            )}

            {/* Tableau du planning type */}
            {formateurSelectionne && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    {/* Header du tableau */}
                    <div style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: 'white',
                        padding: '20px 24px'
                    }}>
                        <h2 style={{ 
                            fontSize: '20px', 
                            fontWeight: '600', 
                            margin: 0 
                        }}>
                            Planning type de {getFormateurNom()}
                        </h2>
                        <p style={{ 
                            fontSize: '14px', 
                            margin: '5px 0 0 0', 
                            opacity: 0.9 
                        }}>
                            Validez les créneaux que vous souhaitez utiliser dans le planning coordinateur
                        </p>
                    </div>

                    {/* Tableau responsive */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb' }}>
                                    <th style={{
                                        border: '1px solid #e5e7eb',
                                        padding: '16px',
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        color: '#374151',
                                        fontSize: '14px',
                                        minWidth: '120px'
                                    }}>
                                        Créneau
                                    </th>
                                    {jours.map((jour) => (
                                        <th key={jour} style={{
                                            border: '1px solid #e5e7eb',
                                            padding: '16px',
                                            textAlign: 'center',
                                            fontWeight: '600',
                                            color: '#374151',
                                            fontSize: '14px',
                                            minWidth: '180px'
                                        }}>
                                            {jour}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {creneaux.map((creneau) => (
                                    <tr key={creneau}>
                                        <td style={{
                                            border: '1px solid #e5e7eb',
                                            padding: '16px',
                                            fontWeight: '600',
                                            color: '#111827',
                                            backgroundColor: '#f9fafb',
                                            fontSize: '14px'
                                        }}>
                                            {creneau}
                                        </td>
                                        {jours.map((jour, dayIndex) => {
                                            const key = `${dayIndex}-${creneau}`
                                            const cellData = planningData[key] || { statut: 'indisponible', lieu: null, valide: false, sansPreference: false }
                                            const couleurStatut = getCouleurStatut(cellData.statut)
                                            
                                            return (
                                                <td key={dayIndex} style={{
                                                    border: '1px solid #e5e7eb',
                                                    padding: '12px',
                                                    backgroundColor: 'white',
                                                    verticalAlign: 'top'
                                                }}>
                                                    {cellData.statut !== 'indisponible' ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {/* Badge statut */}
                                                            <div style={{
                                                                backgroundColor: couleurStatut,
                                                                color: 'white',
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                textAlign: 'center'
                                                            }}>
                                                                {statuts.find(s => s.key === cellData.statut)?.label}
                                                            </div>
                                                            
                                                            {/* ✅ CORRECTION: Affichage lieu OU "Sans Préférence" */}
                                                            {cellData.lieu ? (
                                                                <div style={{
                                                                    backgroundColor: cellData.lieu.couleur || '#6b7280',
                                                                    color: 'white',
                                                                    padding: '6px 10px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    fontWeight: '600',
                                                                    textAlign: 'center'
                                                                }}>
                                                                    {cellData.lieu.initiale} - {cellData.lieu.nom}
                                                                </div>
                                                            ) : cellData.sansPreference ? (
                                                                <div style={{
                                                                    backgroundColor: '#6b7280',
                                                                    color: 'white',
                                                                    padding: '6px 10px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    fontWeight: '600',
                                                                    textAlign: 'center'
                                                                }}>
                                                                    SP - Sans Préférence
                                                                </div>
                                                            ) : null}
                                                            
                                                            {/* Checkbox validation */}
                                                            <label style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                fontSize: '12px',
                                                                cursor: 'pointer',
                                                                padding: '4px',
                                                                borderRadius: '4px',
                                                                backgroundColor: cellData.valide ? '#d1fae5' : '#f3f4f6'
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={cellData.valide}
                                                                    onChange={() => toggleValidation(dayIndex, creneau)}
                                                                    style={{ 
                                                                        width: '16px', 
                                                                        height: '16px',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                />
                                                                <span style={{ 
                                                                    fontWeight: '600',
                                                                    color: cellData.valide ? '#065f46' : '#6b7280'
                                                                }}>
                                                                    {cellData.valide ? 'Validé' : 'À valider'}
                                                                </span>
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <div style={{
                                                            color: '#9ca3af',
                                                            fontSize: '12px',
                                                            textAlign: 'center',
                                                            fontStyle: 'italic',
                                                            padding: '10px'
                                                        }}>
                                                            Indisponible
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer avec actions */}
                    <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '20px 24px',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '15px'
                    }}>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            <strong>Créneaux déclarés :</strong> {getStats().creneauxDeclares} • <strong>Validés :</strong> {getStats().creneauxValides}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={devaliderTout}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Tout dévalider
                            </button>
                            <button
                                onClick={validerTout}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Tout valider
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message d'aide si aucun formateur sélectionné */}
            {!formateurSelectionne && (
                <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '2px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍🏫</div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1d4ed8',
                        marginBottom: '8px'
                    }}>
                        Sélectionnez un formateur pour commencer
                    </h3>
                    <p style={{ color: '#3b82f6', fontSize: '14px' }}>
                        Choisissez un formateur dans la liste déroulante ci-dessus pour consulter et valider son planning type.
                    </p>
                </div>
            )}
        </div>
    )
}

// 🛡️ PROTECTION AVEC HOC - Page titre personnalisé
export default withAuthAdmin(PlanningTypeFormateurs, "Planning Type Formateurs")