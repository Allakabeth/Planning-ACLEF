import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function PlanningTypeFormateurs({ user, logout, inactivityTime, priority }) {
    const router = useRouter()

    // 🎯 MODE ÉDITION : Seulement le premier admin (vert) peut modifier
    const canEdit = priority === 1;

    // États
    const [formateurs, setFormateurs] = useState([])
    const [lieux, setLieux] = useState([])
    const [formateurSelectionne, setFormateurSelectionne] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [planningData, setPlanningData] = useState({})
    const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés
    const [formateursVerrouilles, setFormateursVerrouilles] = useState([]); // Liste des formateurs verrouillés par d'autres admins

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

    // 👥 Charger et écouter les admins connectés en temps réel
    useEffect(() => {
        if (!user) return;

        fetchConnectedAdmins();
        fetchFormateursVerrouilles();

        const channel = supabase
            .channel('admin_sessions_changes_planning_type_formateurs')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'admin_sessions'
                },
                () => {
                    fetchConnectedAdmins();
                    fetchFormateursVerrouilles();
                }
            )
            .subscribe();

        const refreshInterval = setInterval(() => {
            fetchConnectedAdmins();
            fetchFormateursVerrouilles();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(refreshInterval);
        };
    }, [user, formateurs]);

    // 🔒 Cleanup: Libérer le verrouillage formateur au unmount
    useEffect(() => {
        return () => {
            if (user?.email) {
                supabase
                    .from('admin_sessions')
                    .update({ editing_formateur_id: null })
                    .eq('admin_email', user.email)
                    .eq('is_active', true)
                    .then(() => console.log('🔓 Lock formateur libéré au unmount'));
            }
        };
    }, [user]);

    // 🔄 Recharger les données quand la priorité change
    useEffect(() => {
        if (formateurSelectionne && formateurs.length > 0) {
            console.log('🔄 Priorité changée, rechargement planning...');
            loadPlanningFormateur(formateurSelectionne);
        }
    }, [priority]);

    // 👂 Écoute en temps réel des modifications du planning
    useEffect(() => {
        if (!user || !formateurSelectionne) return;

        const channel = supabase
            .channel('planning_type_formateurs_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'planning_type_formateurs',
                filter: `formateur_id=eq.${formateurSelectionne}`
            }, (payload) => {
                console.log('🔄 Modification planning_type_formateurs détectée, refresh...');
                loadPlanningFormateur(formateurSelectionne);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, formateurSelectionne]);

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

        // 🔒 Mettre à jour le lock dans admin_sessions
        try {
            const { error } = await supabase
                .from('admin_sessions')
                .update({ editing_formateur_id: formateurId || null })
                .eq('admin_email', user?.email)
                .eq('is_active', true);

            if (error) {
                console.error('❌ Erreur update lock formateur:', error);
            } else {
                console.log(`🔒 Lock formateur mis à jour: ${formateurId || 'libéré'}`);
            }
        } catch (error) {
            console.error('❌ Erreur handleFormateurChange:', error);
        }

        if (formateurId) {
            await loadPlanningFormateur(formateurId)
        } else {
            initializePlanning()
        }

        setIsLoading(false)
    }

    // Fonction pour récupérer la liste des admins connectés
    const fetchConnectedAdmins = async () => {
        try {
            const { data: sessions, error: sessionsError } = await supabase
                .from('admin_sessions')
                .select('admin_user_id, admin_email, current_page, page_priority, heartbeat')
                .eq('is_active', true)
                .order('heartbeat', { ascending: false});

            if (sessionsError) {
                console.error('❌ Erreur récupération sessions:', sessionsError);
                return;
            }

            if (!sessions || sessions.length === 0) {
                setConnectedAdmins([]);
                return;
            }

            const adminsFormatted = sessions
                .filter(session => session.admin_email)
                .map(session => ({
                    email: session.admin_email,
                    name: session.admin_email.split('@')[0].charAt(0).toUpperCase() + session.admin_email.split('@')[0].slice(1),
                    currentPage: session.current_page,
                    priority: session.page_priority,
                    lastActive: session.heartbeat
                }));

            setConnectedAdmins(adminsFormatted);
        } catch (error) {
            console.error('❌ Erreur fetchConnectedAdmins:', error);
        }
    };

    // 🔒 FONCTION: Récupérer les formateurs verrouillés par d'autres admins
    const fetchFormateursVerrouilles = async () => {
        try {
            const { data: sessions, error } = await supabase
                .from('admin_sessions')
                .select('editing_formateur_id, admin_email')
                .eq('is_active', true)
                .not('editing_formateur_id', 'is', null)
                .neq('admin_email', user?.email);

            if (error) {
                console.error('❌ Erreur récupération formateurs verrouillés:', error);
                return;
            }

            if (!sessions || sessions.length === 0) {
                setFormateursVerrouilles([]);
                return;
            }

            const enrichi = sessions.map(lock => {
                const formateur = formateurs.find(f => f.id === lock.editing_formateur_id);
                return {
                    formateur_id: lock.editing_formateur_id,
                    admin_email: lock.admin_email,
                    admin_name: lock.admin_email.split('@')[0].charAt(0).toUpperCase() + lock.admin_email.split('@')[0].slice(1),
                    formateur_nom: formateur ? `${formateur.prenom} ${formateur.nom}` : 'Inconnu'
                };
            });

            setFormateursVerrouilles(enrichi);
            console.log('🔒 Formateurs verrouillés:', enrichi);

        } catch (error) {
            console.error('❌ Erreur fetchFormateursVerrouilles:', error);
        }
    };

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

            {/* Bandeau avertissement formateur verrouillé */}
            {formateurSelectionne && formateursVerrouilles.some(v => v.formateur_id === formateurSelectionne) && (
                <div style={{
                    backgroundColor: '#fef3c7',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <span style={{
                        color: '#92400e',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        {formateursVerrouilles.find(v => v.formateur_id === formateurSelectionne)?.admin_name} édite le planning type de {formateursVerrouilles.find(v => v.formateur_id === formateurSelectionne)?.formateur_nom}. Vous ne pouvez pas le modifier pour le moment.
                    </span>
                </div>
            )}

            {/* Bandeau blanc avec status */}
            <div className="no-print" style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '8px 20px',
                marginBottom: '20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                {priority && priority < 999 && (
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: priority === 1 ? '#10b981' : priority === 2 ? '#f59e0b' : '#dc2626',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                        {priority}
                    </div>
                )}

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
                                    let badgeColor, action, pageName;

                                    if (!admin.currentPage || admin.currentPage === '/' || admin.currentPage === '') {
                                        badgeColor = '#10b981';
                                        action = 'consulte';
                                        pageName = 'la messagerie';
                                    } else {
                                        badgeColor = admin.priority === 1 ? '#10b981' : admin.priority === 2 ? '#f59e0b' : '#ef4444';
                                        action = admin.priority === 1 ? 'modifie' : 'consulte';
                                        pageName = admin.currentPage.replace('/', '').replace(/-/g, ' ');
                                    }

                                    return (
                                        <div key={index} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 8px',
                                            backgroundColor: badgeColor,
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
                        {formateurs.map((formateur) => {
                            const estVerrouille = formateursVerrouilles.some(v => v.formateur_id === formateur.id);
                            return (
                                <option
                                    key={formateur.id}
                                    value={formateur.id}
                                    disabled={estVerrouille}
                                >
                                    {formateur.prenom} {formateur.nom}
                                    {estVerrouille && ' (En cours d\'édition)'}
                                </option>
                            );
                        })}
                    </select>
                    
                    {formateurSelectionne && (
                        <button
                            onClick={handleValiderTransmettre}
                            disabled={isLoading || !canEdit}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                            style={{
                                padding: '12px 24px',
                                background: (isLoading || !canEdit) ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                boxShadow: (isLoading || !canEdit) ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                                transition: 'transform 0.2s',
                                opacity: (isLoading || !canEdit) ? 0.6 : 1
                            }}
                            onMouseOver={(e) => !isLoading && canEdit && (e.target.style.transform = 'translateY(-2px)')}
                            onMouseOut={(e) => !isLoading && canEdit && (e.target.style.transform = 'translateY(0)')}
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
                                                            <label
                                                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    fontSize: '12px',
                                                                    cursor: canEdit ? 'pointer' : 'not-allowed',
                                                                    padding: '4px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: cellData.valide ? '#d1fae5' : '#f3f4f6',
                                                                    opacity: canEdit ? 1 : 0.5
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={cellData.valide}
                                                                    onChange={() => toggleValidation(dayIndex, creneau)}
                                                                    disabled={!canEdit}
                                                                    style={{
                                                                        width: '16px',
                                                                        height: '16px',
                                                                        cursor: canEdit ? 'pointer' : 'not-allowed'
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
                                disabled={!canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: !canEdit ? '#94a3b8' : '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: !canEdit ? 'not-allowed' : 'pointer',
                                    opacity: !canEdit ? 0.6 : 1
                                }}
                            >
                                Tout dévalider
                            </button>
                            <button
                                onClick={validerTout}
                                disabled={!canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: !canEdit ? '#94a3b8' : '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: !canEdit ? 'not-allowed' : 'pointer',
                                    opacity: !canEdit ? 0.6 : 1
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
                        color: 'white',
                        marginBottom: '8px'
                    }}>
                        Sélectionnez un formateur pour commencer
                    </h3>
                    <p style={{ color: 'white', fontSize: '14px' }}>
                        Choisissez un formateur dans la liste déroulante ci-dessus pour consulter et valider son planning type.
                    </p>
                </div>
            )}
        </div>
    )
}

// 🛡️ PROTECTION AVEC HOC - Page titre personnalisé
export default withAuthAdmin(PlanningTypeFormateurs, "Planning Type Formateurs")