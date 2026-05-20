import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

// Format YYYY-MM-DD en local (evite les decalages UTC)
function formatLocalDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

// Genere la liste des jours ouvres (lun-ven) entre deux dates (incluses),
// groupes par mois pour l'affichage du calendrier mode "dates ponctuelles".
// Si dateDebut/dateFin manquantes ou invalides, retourne un tableau vide.
function genererJoursOuvresParPeriode(dateDebut, dateFin) {
    if (!dateDebut || !dateFin) return []
    const start = new Date(dateDebut)
    const end = new Date(dateFin)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    if (end < start) return []

    const moisMap = new Map() // monthKey -> { key, label, jours: [] }
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay()
        if (dow === 0 || dow === 6) continue // week-end
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!moisMap.has(monthKey)) {
            const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            moisMap.set(monthKey, { key: monthKey, label, jours: [] })
        }
        moisMap.get(monthKey).jours.push({
            date: formatLocalDate(d),
            label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' })
        })
    }
    return Array.from(moisMap.values())
}

function PlanningTypeApprenants({ user, logout, inactivityTime, priority }) {
    const router = useRouter()

    // États principaux
    const [apprenants, setApprenants] = useState([])
    const [apprenantSelectionne, setApprenantSelectionne] = useState(null)
    const [lieux, setLieux] = useState([])
    const [planningType, setPlanningType] = useState({})
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés
    const [apprenantsVerrouilles, setApprenantsVerrouilles] = useState([]); // Apprenants en cours d'édition

    // Mode "dates ponctuelles" : alternative au planning hebdo
    // 'hebdo' = grille jour x creneau (defaut, comportement actuel)
    // 'dates' = calendrier 6 mois ou on coche les dates de formation
    const [modePlanning, setModePlanning] = useState('hebdo')
    const [lieuModeDate, setLieuModeDate] = useState('') // Lieu unique pour le mode dates
    const [datesCochees, setDatesCochees] = useState(new Set()) // Set<"YYYY-MM-DD_matin" | "YYYY-MM-DD_AM">

    // Calendrier base sur les dates de parcours de l'apprenant selectionne
    // (date_entree_formation -> date_fin_formation_reelle || date_sortie_previsionnelle)
    // Inclut aussi les dates deja cochees au cas ou elles depassent la fin du parcours.
    const moisCalendrier = useMemo(() => {
        if (!apprenantSelectionne) return []
        const debut = apprenantSelectionne.date_entree_formation
        const finParcours = apprenantSelectionne.date_fin_formation_reelle || apprenantSelectionne.date_sortie_previsionnelle
        if (!debut || !finParcours) return []

        // Si une date cochee depasse la fin du parcours, on etend pour la rendre visible
        let finEffective = finParcours
        for (const k of datesCochees) {
            const d = k.split('_')[0]
            if (d > finEffective) finEffective = d
        }
        return genererJoursOuvresParPeriode(debut, finEffective)
    }, [apprenantSelectionne, datesCochees])

    // 🎯 MODE ÉDITION : On peut modifier SI l'apprenant n'est PAS verrouillé par un autre admin
    const apprenantEstVerrouille = apprenantSelectionne && apprenantsVerrouilles.some(v => v.apprenant_id === apprenantSelectionne.id);
    const canEdit = !apprenantEstVerrouille;

    // Constantes
    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
    const creneaux = ['matin', 'AM']

    // Chargement initial des données
    useEffect(() => {
        fetchApprenants()
        fetchLieux()
    }, [])

    // Gestion de la présélection via query parameter
    useEffect(() => {
        if (apprenants.length > 0 && router.query.apprenant) {
            const apprenantId = router.query.apprenant
            const apprenant = apprenants.find(a => a.id === apprenantId)
            if (apprenant && !apprenantSelectionne) {
                handleApprenantChange(apprenantId)
            }
        }
    }, [apprenants, router.query.apprenant])

    // 👥 Charger et écouter les admins connectés en temps réel
    useEffect(() => {
        if (!user) return;

        fetchConnectedAdmins();
        fetchApprenantsVerrouilles();

        const channel = supabase
            .channel('admin_sessions_changes_planning_type_apprenants')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'admin_sessions'
                },
                () => {
                    fetchConnectedAdmins();
                    fetchApprenantsVerrouilles();
                }
            )
            .subscribe();

        const refreshInterval = setInterval(() => {
            fetchConnectedAdmins();
            fetchApprenantsVerrouilles();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(refreshInterval);
        };
    }, [user, apprenants]);

    // 🔄 Recharger les données quand la priorité change
    useEffect(() => {
        if (apprenantSelectionne) {
            console.log('🔄 Priorité changée, rechargement planning...');
            fetchPlanningType(apprenantSelectionne.id);
        }
    }, [priority]);

    // 👂 Écoute en temps réel des modifications du planning
    useEffect(() => {
        if (!user || !apprenantSelectionne) return;

        const channel = supabase
            .channel('planning_apprenants_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'planning_apprenants',
                filter: `apprenant_id=eq.${apprenantSelectionne.id}`
            }, (payload) => {
                console.log('🔄 Modification planning_apprenants détectée, refresh...');
                fetchPlanningType(apprenantSelectionne.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, apprenantSelectionne])

    // 🔓 Libérer le lock au unmount de la page
    useEffect(() => {
        return () => {
            // Libérer le lock à la sortie
            if (user?.email) {
                supabase
                    .from('admin_sessions')
                    .update({ editing_apprenant_id: null })
                    .eq('admin_email', user.email)
                    .eq('is_active', true)
                    .then(() => console.log('🔓 Lock apprenant libéré'));
            }
        };
    }, [user]);

    // Fonction pour récupérer les apprenants
    const fetchApprenants = async () => {
        try {
            // Tentative avec vue enrichie
            let { data, error } = await supabase
                .from('apprenants_actifs')
                .select('id, prenom, nom, statut_formation, date_entree_formation, date_sortie_previsionnelle, date_fin_formation_reelle')
                .eq('statut_formation', 'en_cours')
                .order('nom')

            // Fallback sur table users si vue indisponible
            if (error && error.code === 'PGRST106') {
                console.log('Vue apprenants_actifs non disponible, utilisation table users')
                const result = await supabase
                    .from('users')
                    .select('id, prenom, nom, statut_formation, date_entree_formation, date_sortie_previsionnelle, date_fin_formation_reelle')
                    .eq('role', 'apprenant')
                    .eq('archive', false)
                    .order('nom')
                
                data = result.data
                error = result.error
            }

            if (error) throw error
            setApprenants(data || [])
        } catch (err) {
            console.error('Erreur chargement apprenants:', err)
            setMessage({
                type: 'error',
                text: 'Erreur lors du chargement des apprenants'
            })
        }
    }

    // Fonction pour récupérer les lieux
    const fetchLieux = async () => {
        try {
            const { data, error } = await supabase
                .from('lieux')
                .select('id, nom, couleur, initiale')
                .eq('archive', false)
                .order('nom')

            if (error) throw error
            setLieux(data || [])
        } catch (err) {
            console.error('Erreur chargement lieux:', err)
            setMessage({
                type: 'error',
                text: 'Erreur lors du chargement des lieux'
            })
        }
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

    // Fonction pour récupérer les apprenants en cours d'édition par d'autres admins
    const fetchApprenantsVerrouilles = async () => {
        try {
            const { data: sessions, error } = await supabase
                .from('admin_sessions')
                .select('editing_apprenant_id, admin_email')
                .eq('is_active', true)
                .not('editing_apprenant_id', 'is', null)
                .neq('admin_email', user?.email);

            if (error) {
                console.error('❌ Erreur fetchApprenantsVerrouilles:', error);
                return;
            }

            // Enrichir avec les noms des apprenants
            const enrichi = sessions.map(lock => {
                const apprenant = apprenants.find(a => a.id === lock.editing_apprenant_id);
                return {
                    apprenant_id: lock.editing_apprenant_id,
                    admin_email: lock.admin_email,
                    admin_name: lock.admin_email.split('@')[0].charAt(0).toUpperCase() + lock.admin_email.split('@')[0].slice(1),
                    apprenant_nom: apprenant ? `${apprenant.prenom} ${apprenant.nom}` : 'Inconnu'
                };
            });

            setApprenantsVerrouilles(enrichi);
        } catch (error) {
            console.error('❌ Erreur fetchApprenantsVerrouilles:', error);
        }
    };

    // Fonction pour charger le planning existant d'un apprenant
    // Detecte automatiquement le mode : si planning_apprenants_dates contient
    // des lignes pour cet apprenant -> mode 'dates', sinon mode 'hebdo'
    const fetchPlanningType = async (apprenantId) => {
        if (!apprenantId) return

        setLoading(true)
        try {
            const [hebdoRes, datesRes] = await Promise.all([
                supabase
                    .from('planning_apprenants')
                    .select(`jour, creneau, lieu_id, lieux:lieu_id (nom, couleur, initiale)`)
                    .eq('apprenant_id', apprenantId)
                    .eq('actif', true),
                supabase
                    .from('planning_apprenants_dates')
                    .select('date, creneau, lieu_id')
                    .eq('apprenant_id', apprenantId)
            ])

            if (hebdoRes.error) throw hebdoRes.error
            if (datesRes.error) throw datesRes.error

            const datesData = datesRes.data || []

            if (datesData.length > 0) {
                // Mode dates ponctuelles
                setModePlanning('dates')
                setLieuModeDate(datesData[0].lieu_id || '')
                setDatesCochees(new Set(datesData.map(r => `${r.date}_${r.creneau}`)))
                setPlanningType({}) // grille hebdo vide
            } else {
                // Mode hebdo (defaut / comportement actuel)
                setModePlanning('hebdo')
                setLieuModeDate('')
                setDatesCochees(new Set())
                const planning = {}
                hebdoRes.data?.forEach(item => {
                    const key = `${item.jour}-${item.creneau}`
                    planning[key] = {
                        lieu_id: item.lieu_id,
                        lieu_nom: item.lieux?.nom,
                        lieu_couleur: item.lieux?.couleur,
                        lieu_initiale: item.lieux?.initiale
                    }
                })
                setPlanningType(planning)
            }
        } catch (err) {
            console.error('Erreur chargement planning:', err)
            setMessage({
                type: 'error',
                text: 'Erreur lors du chargement du planning'
            })
        } finally {
            setLoading(false)
        }
    }

    // Gestion changement d'apprenant sélectionné
    const handleApprenantChange = async (apprenantId) => {
        const apprenant = apprenants.find(a => a.id === apprenantId)
        setApprenantSelectionne(apprenant)
        setPlanningType({}) // Reset grille
        setMessage(null)

        // Mettre à jour le lock dans admin_sessions
        const { error } = await supabase
            .from('admin_sessions')
            .update({ editing_apprenant_id: apprenantId || null })
            .eq('admin_email', user?.email)
            .eq('is_active', true);

        if (error) {
            console.error('❌ Erreur update lock apprenant:', error);
        }

        if (apprenant) {
            fetchPlanningType(apprenant.id)
        }
    }

    // Gestion changement d'une case de la grille
    const handleCaseChange = (key, lieuId) => {
        if (lieuId) {
            const lieu = lieux.find(l => l.id === lieuId)
            setPlanningType(prev => ({
                ...prev,
                [key]: {
                    lieu_id: lieuId,
                    lieu_nom: lieu?.nom,
                    lieu_couleur: lieu?.couleur,
                    lieu_initiale: lieu?.initiale
                }
            }))
        } else {
            // Retirer la sélection
            setPlanningType(prev => {
                const newPlanning = { ...prev }
                delete newPlanning[key]
                return newPlanning
            })
        }
    }

    // Bascule entre les deux modes (efface les saisies non sauvegardees de l'autre mode)
    const handleChangeMode = (nouveauMode) => {
        if (nouveauMode === modePlanning) return
        setModePlanning(nouveauMode)
        setMessage(null)
        // Vider l'etat de l'autre mode pour eviter la confusion
        if (nouveauMode === 'dates') {
            setPlanningType({})
        } else {
            setLieuModeDate('')
            setDatesCochees(new Set())
        }
    }

    // Toggle d'une case (date, creneau) dans le calendrier mode "dates"
    const toggleDateCreneau = (date, creneau) => {
        const k = `${date}_${creneau}`
        setDatesCochees(prev => {
            const next = new Set(prev)
            if (next.has(k)) next.delete(k); else next.add(k)
            return next
        })
    }

    // Sauvegarde du planning
    // Garantit l'exclusivite mode hebdo / mode dates en supprimant toujours
    // les lignes de l'autre table pour cet apprenant.
    const sauvegarderPlanning = async () => {
        if (!apprenantSelectionne) {
            setMessage({
                type: 'error',
                text: 'Veuillez sélectionner un apprenant'
            })
            return
        }

        if (modePlanning === 'dates' && !lieuModeDate && datesCochees.size > 0) {
            setMessage({
                type: 'error',
                text: 'Veuillez sélectionner un lieu pour les dates ponctuelles'
            })
            return
        }

        setLoading(true)
        try {
            // 1. Toujours vider les deux tables pour cet apprenant (exclusivite)
            await Promise.all([
                supabase.from('planning_apprenants').delete().eq('apprenant_id', apprenantSelectionne.id),
                supabase.from('planning_apprenants_dates').delete().eq('apprenant_id', apprenantSelectionne.id)
            ])

            if (modePlanning === 'hebdo') {
                // 2a. Insert mode hebdo (comportement existant)
                const planningArray = Object.entries(planningType)
                    .filter(([key, value]) => value.lieu_id)
                    .map(([key, value]) => {
                        const [jour, creneau] = key.split('-')
                        return {
                            apprenant_id: apprenantSelectionne.id,
                            jour,
                            creneau,
                            lieu_id: value.lieu_id
                        }
                    })

                if (planningArray.length > 0) {
                    const { error } = await supabase
                        .from('planning_apprenants')
                        .insert(planningArray)
                    if (error) throw error
                }

                setMessage({
                    type: 'success',
                    text: `✅ Planning sauvegardé pour ${apprenantSelectionne.prenom} ${apprenantSelectionne.nom} (${planningArray.length} créneaux)`
                })
            } else {
                // 2b. Insert mode dates ponctuelles
                const rows = Array.from(datesCochees).map(k => {
                    const [date, creneau] = k.split('_')
                    return {
                        apprenant_id: apprenantSelectionne.id,
                        date,
                        creneau,
                        lieu_id: lieuModeDate
                    }
                })

                if (rows.length > 0) {
                    const { error } = await supabase
                        .from('planning_apprenants_dates')
                        .insert(rows)
                    if (error) throw error
                }

                setMessage({
                    type: 'success',
                    text: `✅ Planning sauvegardé pour ${apprenantSelectionne.prenom} ${apprenantSelectionne.nom} (${rows.length} créneaux sur dates précises)`
                })
            }

        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            setMessage({
                type: 'error',
                text: '❌ Erreur lors de la sauvegarde'
            })
        } finally {
            setLoading(false)
        }
    }

    // Composant Case de planning
    const CasePlanning = ({ jour, creneau }) => {
        const key = `${jour}-${creneau}`
        const currentValue = planningType[key]

        return (
            <td className="case-planning">
                <div
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}
                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                >
                    <select
                        value={currentValue?.lieu_id || ''}
                        onChange={(e) => handleCaseChange(key, e.target.value)}
                        className="select-lieu"
                        style={{
                            backgroundColor: currentValue?.lieu_couleur || 'rgba(255, 255, 255, 0.9)',
                            color: currentValue?.lieu_couleur ? 'white' : '#374151',
                            fontWeight: currentValue?.lieu_couleur ? 'bold' : 'normal',
                            opacity: (!apprenantSelectionne || !canEdit) ? 0.5 : 1,
                            cursor: (!apprenantSelectionne || !canEdit) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={!apprenantSelectionne || !canEdit}
                    >
                        <option value="">--</option>
                        {lieux.map(lieu => (
                            <option key={lieu.id} value={lieu.id}>
                                {lieu.initiale || lieu.nom}
                            </option>
                        ))}
                    </select>
                </div>
            </td>
        )
    }

    // Statistiques du planning (depend du mode actif)
    const nbCreneaux = modePlanning === 'hebdo'
        ? Object.keys(planningType).length
        : datesCochees.size

    return (
        <>
            {/* Styles CSS intégrés */}
            <style jsx>{`
                .planning-type-apprenants {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                }

                .container-planning {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #e5e7eb;
                    padding: 30px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .header-title {
                    color: #667eea;
                    font-size: 28px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 30px;
                    text-shadow: 0 2px 4px rgba(255,255,255,0.3);
                }


                .selecteur-section {
                    background: #667eea;
                    border-radius: 15px;
                    padding: 25px;
                    margin-bottom: 30px;
                    border: 1px solid #667eea;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }

                .selecteur-label {
                    color: white;
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    display: block;
                }

                .select-apprenant {
                    width: 100%;
                    max-width: 400px;
                    padding: 12px 16px;
                    border: none;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.95);
                    font-size: 16px;
                    font-weight: 500;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    cursor: pointer;
                    text-align: center;
                    margin: 0 auto;
                    display: block;
                }

                .grille-container {
                    background: #667eea;
                    border-radius: 15px;
                    padding: 20px;
                    margin: 20px 0;
                    border: 1px solid #667eea;
                }

                .grille-planning {
                    width: 100%;
                    border-collapse: collapse;
                    background: transparent;
                    border-radius: 15px;
                    overflow: hidden;
                    border: none;
                }

                .header-jour, .header-creneau {
                    background: transparent;
                    color: white;
                    padding: 15px;
                    font-weight: bold;
                    text-align: center;
                    font-size: 14px;
                    border: none;
                }

                .label-creneau {
                    background: transparent;
                    color: white;
                    padding: 15px;
                    font-weight: bold;
                    text-align: center;
                    width: 100px;
                    font-size: 13px;
                    border: none;
                }

                .case-planning {
                    padding: 12px;
                    border: none;
                    text-align: center !important;
                    background: transparent;
                    transition: background-color 0.3s ease;
                    vertical-align: middle;
                    width: auto;
                }

                .case-planning:hover {
                    background: #f9fafb;
                }

                .select-lieu {
                    width: 120px !important;
                    max-width: 120px !important;
                    padding: 6px 4px !important;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 12px !important;
                    font-weight: bold !important;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin: 0 auto !important;
                    display: inline-block !important;
                    text-align: center !important;
                    text-align-last: center !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    appearance: none !important;
                    background-repeat: no-repeat;
                    background-position: right 4px center;
                    background-size: 8px;
                    background-image: url("data:image/svg+xml;charset=UTF-8,<svg viewBox='0 0 16 16' fill='%23374151' xmlns='http://www.w3.org/2000/svg'><path d='M4.427 6.427a.75.75 0 011.06 0L8 8.94l2.513-2.513a.75.75 0 111.06 1.06l-3.043 3.044a.75.75 0 01-1.06 0L4.427 7.487a.75.75 0 010-1.06z'/></svg>") !important;
                    padding-right: 16px !important;
                }

                .select-lieu:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .actions-section {
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    text-align: center;
                    border: none;
                }

                .btn-sauvegarder {
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
                }

                .btn-sauvegarder:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
                }

                .btn-sauvegarder:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .stats-planning {
                    margin-top: 15px;
                    color: #6b7280;
                    font-size: 16px;
                    font-style: italic;
                }

                .message {
                    padding: 15px 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    font-weight: 500;
                    text-align: center;
                }

                .message.success {
                    background: rgba(76, 175, 80, 0.2);
                    color: #4CAF50;
                    border: 1px solid rgba(76, 175, 80, 0.3);
                }

                .message.error {
                    background: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                    border: 1px solid rgba(244, 67, 54, 0.3);
                }

                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 15px;
                }

                @media (max-width: 768px) {
                    .planning-type-apprenants {
                        padding: 10px;
                    }

                    .container-planning {
                        padding: 20px;
                    }

                    .grille-planning {
                        font-size: 12px;
                    }

                    .select-lieu {
                        font-size: 11px;
                        padding: 6px;
                    }

                    .header-jour, .label-creneau {
                        padding: 8px;
                        font-size: 12px;
                    }
                }

                /* Toggle mode hebdo / dates */
                .mode-toggle {
                    display: flex;
                    justify-content: center;
                    gap: 0;
                    margin: 20px 0 10px 0;
                }
                .mode-toggle button {
                    padding: 10px 24px;
                    border: 2px solid #667eea;
                    background: white;
                    color: #667eea;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .mode-toggle button:first-child {
                    border-radius: 8px 0 0 8px;
                    border-right: none;
                }
                .mode-toggle button:last-child {
                    border-radius: 0 8px 8px 0;
                }
                .mode-toggle button.active {
                    background: #667eea;
                    color: white;
                }
                .mode-toggle button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Calendrier mode dates ponctuelles */
                .calendar-container {
                    background: #667eea;
                    border-radius: 15px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .calendar-lieu-selector {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                    color: white;
                    font-weight: 600;
                }
                .calendar-lieu-selector select {
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: none;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    min-width: 200px;
                }
                .calendar-months {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                }
                .calendar-month {
                    background: white;
                    border-radius: 10px;
                    padding: 14px;
                }
                .calendar-month h3 {
                    margin: 0 0 10px 0;
                    color: #667eea;
                    font-size: 16px;
                    text-transform: capitalize;
                    text-align: center;
                    border-bottom: 2px solid #f3f4f6;
                    padding-bottom: 8px;
                }
                .calendar-day-row {
                    display: grid;
                    grid-template-columns: 1fr auto auto;
                    align-items: center;
                    gap: 12px;
                    padding: 6px 4px;
                    border-bottom: 1px solid #f3f4f6;
                    font-size: 13px;
                }
                .calendar-day-row:last-child {
                    border-bottom: none;
                }
                .calendar-day-label {
                    color: #374151;
                    text-transform: capitalize;
                }
                .calendar-cb {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    color: #6b7280;
                    cursor: pointer;
                    user-select: none;
                }
                .calendar-cb input {
                    cursor: pointer;
                }
                .calendar-cb input:disabled,
                .calendar-cb input:disabled + span {
                    cursor: not-allowed;
                    opacity: 0.5;
                }
            `}</style>

            <div className="planning-type-apprenants">
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
                        <span style={{ color: '#8b5cf6', fontWeight: '500' }}>Planning Type Apprenants</span>
                    </nav>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                        <button
                            onClick={logout}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            🚪 Déconnexion
                        </button>
                    </div>
                </div>

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

                <div className="container-planning">
                    <h1 className="header-title">
                        Planning Type Apprenants
                    </h1>

                    {/* Bandeau d'avertissement si apprenant verrouillé */}
                    {apprenantSelectionne && apprenantsVerrouilles.some(v => v.apprenant_id === apprenantSelectionne.id) && (
                        <div style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: '16px 24px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            textAlign: 'center',
                            fontSize: '16px',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                        }}>
                            ⚠️ {apprenantsVerrouilles.find(v => v.apprenant_id === apprenantSelectionne.id)?.admin_name} édite les changements de {apprenantSelectionne.prenom} {apprenantSelectionne.nom}. Vous ne pouvez pas le modifier pour le moment.
                        </div>
                    )}

                    {/* Sélecteur d'apprenant */}
                    <div className="selecteur-section">
                        <label className="selecteur-label">
                            Sélectionner un apprenant :
                        </label>
                        <select
                            value={apprenantSelectionne?.id || ''}
                            onChange={(e) => handleApprenantChange(e.target.value)}
                            className="select-apprenant"
                        >
                            <option value="">-- Choisir un apprenant --</option>
                            {apprenants.map(apprenant => {
                                const estVerrouille = apprenantsVerrouilles.some(v => v.apprenant_id === apprenant.id);
                                return (
                                    <option
                                        key={apprenant.id}
                                        value={apprenant.id}
                                        disabled={estVerrouille}
                                    >
                                        {apprenant.prenom} {apprenant.nom}
                                        {estVerrouille && ' (En cours d\'édition)'}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Toggle mode hebdo / dates ponctuelles */}
                    {apprenantSelectionne && (
                        <div className="mode-toggle">
                            <button
                                className={modePlanning === 'hebdo' ? 'active' : ''}
                                onClick={() => handleChangeMode('hebdo')}
                                disabled={!canEdit}
                            >
                                Planning hebdomadaire
                            </button>
                            <button
                                className={modePlanning === 'dates' ? 'active' : ''}
                                onClick={() => handleChangeMode('dates')}
                                disabled={!canEdit}
                            >
                                Dates ponctuelles
                            </button>
                        </div>
                    )}

                    {/* Message d'information */}
                    {message && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Grille de planning (mode hebdo) OU calendrier (mode dates) */}
                    {modePlanning === 'hebdo' ? (
                        <div className="grille-container" style={{ position: 'relative' }}>
                            {loading && (
                                <div className="loading-overlay">
                                    <div style={{ color: 'white', fontSize: '18px' }}>
                                        Chargement...
                                    </div>
                                </div>
                            )}

                            <table className="grille-planning">
                                <thead>
                                    <tr>
                                        <th className="header-creneau"></th>
                                        {jours.map(jour => (
                                            <th key={jour} className="header-jour">
                                                {jour.charAt(0).toUpperCase() + jour.slice(1)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {creneaux.map(creneau => (
                                        <tr key={creneau}>
                                            <td className="label-creneau">
                                                {creneau === 'matin' ? 'Matin' : 'AM'}
                                            </td>
                                            {jours.map(jour => (
                                                <CasePlanning
                                                    key={`${jour}-${creneau}`}
                                                    jour={jour}
                                                    creneau={creneau}
                                                />
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="calendar-container" style={{ position: 'relative' }}>
                            {loading && (
                                <div className="loading-overlay">
                                    <div style={{ color: 'white', fontSize: '18px' }}>
                                        Chargement...
                                    </div>
                                </div>
                            )}

                            <div className="calendar-lieu-selector">
                                <label htmlFor="lieu-mode-date">Lieu unique :</label>
                                <select
                                    id="lieu-mode-date"
                                    value={lieuModeDate}
                                    onChange={(e) => setLieuModeDate(e.target.value)}
                                    disabled={!apprenantSelectionne || !canEdit}
                                >
                                    <option value="">-- Choisir un lieu --</option>
                                    {lieux.map(lieu => (
                                        <option key={lieu.id} value={lieu.id}>
                                            {lieu.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {moisCalendrier.length === 0 && apprenantSelectionne && (
                                <div style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    color: '#b91c1c',
                                    textAlign: 'center',
                                    fontWeight: '600'
                                }}>
                                    ⚠️ Impossible d'afficher le calendrier : cet apprenant n'a pas de date d'entrée ou de date de fin de formation renseignée.
                                </div>
                            )}

                            <div className="calendar-months">
                                {moisCalendrier.map(mois => (
                                    <div key={mois.key} className="calendar-month">
                                        <h3>{mois.label}</h3>
                                        {mois.jours.map(jour => (
                                            <div key={jour.date} className="calendar-day-row">
                                                <span className="calendar-day-label">{jour.label}</span>
                                                <label className="calendar-cb">
                                                    <input
                                                        type="checkbox"
                                                        checked={datesCochees.has(`${jour.date}_matin`)}
                                                        onChange={() => toggleDateCreneau(jour.date, 'matin')}
                                                        disabled={!apprenantSelectionne || !canEdit || !lieuModeDate}
                                                    />
                                                    <span>M</span>
                                                </label>
                                                <label className="calendar-cb">
                                                    <input
                                                        type="checkbox"
                                                        checked={datesCochees.has(`${jour.date}_AM`)}
                                                        onChange={() => toggleDateCreneau(jour.date, 'AM')}
                                                        disabled={!apprenantSelectionne || !canEdit || !lieuModeDate}
                                                    />
                                                    <span>AM</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions et statistiques */}
                    <div className="actions-section">
                        <button
                            onClick={sauvegarderPlanning}
                            disabled={!apprenantSelectionne || loading || !canEdit}
                            className="btn-sauvegarder"
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                            style={{
                                opacity: (!apprenantSelectionne || loading || !canEdit) ? 0.5 : 1,
                                background: (!apprenantSelectionne || loading || !canEdit) ? '#94a3b8' : 'linear-gradient(135deg, #4CAF50, #45a049)',
                                cursor: (!apprenantSelectionne || loading || !canEdit) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Sauvegarde...' : 'Sauvegarder Planning'}
                        </button>

                        {apprenantSelectionne && (
                            <div className="stats-planning">
                                {nbCreneaux} créneau(s) défini(s) pour {apprenantSelectionne.prenom} {apprenantSelectionne.nom}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

// Protection avec HOC admin
export default withAuthAdmin(PlanningTypeApprenants, "Planning Type Apprenants")