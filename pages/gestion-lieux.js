import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function GestionLieux({ user, logout, inactivityTime, priority }) {
    const router = useRouter()

    // 🎯 MODE ÉDITION : Seulement le premier admin (vert) peut modifier
    const canEdit = priority === 1;

    // États
    const [lieux, setLieux] = useState([])
    const [filtreStatut, setFiltreStatut] = useState('actif')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés

    // États formulaire ajout
    const [showAjouterForm, setShowAjouterForm] = useState(false)
    const [nom, setNom] = useState('')
    const [initiale, setInitiale] = useState('')
    const [couleur, setCouleur] = useState('#3b82f6')

    // États formulaire modification
    const [lieuEnModification, setLieuEnModification] = useState(null)
    const [showModifierForm, setShowModifierForm] = useState(false)

    // États pour confirmation
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [actionEnCours, setActionEnCours] = useState(null)

    // Couleurs prédéfinies pour le sélecteur
    const couleursPredefinies = [
        '#ef4444', // Rouge
        '#f97316', // Orange
        '#f59e0b', // Ambre
        '#eab308', // Jaune
        '#84cc16', // Lime
        '#22c55e', // Vert
        '#10b981', // Emeraude
        '#14b8a6', // Teal
        '#06b6d4', // Cyan
        '#0ea5e9', // Bleu ciel
        '#3b82f6', // Bleu
        '#6366f1', // Indigo
        '#8b5cf6', // Violet
        '#a855f7', // Purple
        '#d946ef', // Fuchsia
        '#ec4899', // Pink
        '#f43f5e', // Rose
        '#6b7280'  // Gris
    ]

    useEffect(() => {
        fetchLieux()
    }, [filtreStatut])

    // Auto-génération de l'initiale
    useEffect(() => {
        if (nom) {
            const words = nom.split(' ')
            let initialeAuto = ''

            if (words.length >= 2) {
                // Si plusieurs mots, prendre la première lettre de chaque (max 3)
                initialeAuto = words.slice(0, 3).map(w => w.charAt(0)).join('').toUpperCase()
            } else {
                // Si un seul mot, prendre les 3 premières lettres
                initialeAuto = nom.substring(0, 3).toUpperCase()
            }

            setInitiale(initialeAuto)
        }
    }, [nom])

    // 👥 Charger et écouter les admins connectés en temps réel
    useEffect(() => {
        if (!user) return;

        fetchConnectedAdmins();

        const channel = supabase
            .channel('admin_sessions_changes_gestion_lieux')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'admin_sessions'
                },
                () => {
                    fetchConnectedAdmins();
                }
            )
            .subscribe();

        const refreshInterval = setInterval(() => {
            fetchConnectedAdmins();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(refreshInterval);
        };
    }, [user]);

    // 🔄 Recharger les données quand la priorité change
    useEffect(() => {
        console.log('🔄 Priorité changée, rechargement lieux...');
        fetchLieux();
    }, [priority]);

    // 👂 Écoute en temps réel des modifications des lieux
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('lieux_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'lieux'
            }, (payload) => {
                console.log('🔄 Modification lieux détectée, refresh...');
                fetchLieux();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, filtreStatut])

    // Fonction pour récupérer les lieux
    const fetchLieux = async () => {
        try {
            const { data, error } = await supabase
                .from('lieux')
                .select('*')
                .order('nom')

            if (error) throw error

            let lieuxFiltres = data || []

            if (filtreStatut === 'actif') {
                lieuxFiltres = data.filter(l => l.archive !== true)
            } else if (filtreStatut === 'archive') {
                lieuxFiltres = data.filter(l => l.archive === true)
            }

            setLieux(lieuxFiltres)
        } catch (error) {
            setMessage('Erreur lors du chargement des lieux')
            console.error(error)
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

    // Fonction pour ajouter un lieu
    const handleSubmitAjout = async (e) => {
        e.preventDefault()
        
        if (!nom.trim() || !initiale.trim()) {
            setMessage('Le nom et l\'initiale sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase.from('lieux').insert([{
                nom: nom.trim(),
                initiale: initiale.trim().toUpperCase(),
                couleur: couleur,
                archive: false
            }])
            
            if (error) throw error
            
            setMessage('Lieu ajouté avec succès !')
            setTimeout(() => setMessage(''), 4000)
            
            // Réinitialiser le formulaire
            setNom('')
            setInitiale('')
            setCouleur('#3b82f6')
            setShowAjouterForm(false)
            await fetchLieux()
            
        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Fonction pour modifier un lieu
    const handleSubmitModification = async (e) => {
        e.preventDefault()
        
        if (!lieuEnModification || !lieuEnModification.nom.trim() || !lieuEnModification.initiale.trim()) {
            setMessage('Le nom et l\'initiale sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('lieux')
                .update({ 
                    nom: lieuEnModification.nom.trim(),
                    initiale: lieuEnModification.initiale.trim().toUpperCase(),
                    couleur: lieuEnModification.couleur
                })
                .eq('id', lieuEnModification.id)
            
            if (error) throw error
            
            setMessage('Lieu modifié avec succès !')
            setTimeout(() => setMessage(''), 4000)
            setLieuEnModification(null)
            setShowModifierForm(false)
            await fetchLieux()
            
        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Initier la modification
    const initierModification = (lieu) => {
        setLieuEnModification({...lieu})
        setShowModifierForm(true)
        setShowAjouterForm(false)
    }

    // Actions archiver/désarchiver/supprimer
    const initierAction = (lieu, typeAction) => {
        setActionEnCours({
            lieu: lieu,
            type: typeAction,
            message: getMessageConfirmation(lieu, typeAction)
        })
        setShowConfirmation(true)
    }

    const getMessageConfirmation = (lieu, typeAction) => {
        switch (typeAction) {
            case 'archiver':
                return `Archiver le lieu "${lieu.nom}" ?`
            case 'desarchiver':
                return `Désarchiver le lieu "${lieu.nom}" ?`
            case 'supprimer':
                return `Supprimer définitivement le lieu "${lieu.nom}" ?\n\nATTENTION : Action irréversible !`
            default:
                return 'Confirmer cette action ?'
        }
    }

    const executerAction = async () => {
        if (!actionEnCours) return

        setIsLoading(true)
        try {
            const { lieu, type } = actionEnCours

            if (type === 'archiver') {
                await supabase.from('lieux').update({ archive: true }).eq('id', lieu.id)
                setMessage('Lieu archivé avec succès !')
            } else if (type === 'desarchiver') {
                await supabase.from('lieux').update({ archive: false }).eq('id', lieu.id)
                setMessage('Lieu désarchivé avec succès !')
            } else if (type === 'supprimer') {
                await supabase.from('lieux').delete().eq('id', lieu.id)
                setMessage('Lieu supprimé définitivement !')
            }

            setTimeout(() => setMessage(''), 4000)
            await fetchLieux()

        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
            setActionEnCours(null)
            setShowConfirmation(false)
        }
    }

    // Compter les lieux
    const compterLieux = () => {
        const actifs = lieux.filter(l => !l.archive).length
        const archives = lieux.filter(l => l.archive).length
        return { actifs, archives, total: lieux.length }
    }

    const stats = compterLieux()

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
                    <span style={{ color: '#10b981', fontWeight: '500' }}>Gestion des Lieux</span>
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
                        🏠 Accueil
                    </button>

                    <button
                        onClick={logout}
                        style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
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

                {connectedAdmins.length > 0 && (
                    <>
                        <div style={{
                            width: '1px',
                            height: '30px',
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
                    Gestion des Lieux
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Gérez les lieux de formation avec leurs couleurs distinctives
                </p>
            </div>

            {/* Message de notification */}
            {message && (
                <div style={{
                    backgroundColor: message.includes('succès') ? '#d1fae5' : '#fee2e2',
                    color: message.includes('succès') ? '#065f46' : '#991b1b',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontWeight: '500'
                }}>
                    {message}
                </div>
            )}

            {/* Bouton Ajouter */}
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => {
                        setShowAjouterForm(!showAjouterForm)
                        setShowModifierForm(false)
                    }}
                    disabled={!canEdit}
                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: !canEdit ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                        opacity: !canEdit ? 0.6 : 1,
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => { if (canEdit) e.target.style.transform = 'scale(1.02)' }}
                    onMouseOut={(e) => { if (canEdit) e.target.style.transform = 'scale(1)' }}
                >
                    📍 Ajouter un nouveau lieu
                </button>
            </div>

            {/* Formulaire d'ajout */}
            {showAjouterForm && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>Nouveau lieu</h3>
                    <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #0ea5e9',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '15px'
                    }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#0284c7' }}>
                            <strong>🎨 Gestion couleurs et initiales :</strong> Les initiales se génèrent automatiquement selon le nom (3 premières lettres ou première lettre de chaque mot). Choisissez une couleur pour identifier facilement ce lieu dans les plannings.
                        </p>
                    </div>
                    <form onSubmit={handleSubmitAjout}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 200px', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>
                                    Nom du lieu *
                                </label>
                                <input
                                    type="text"
                                    value={nom}
                                    onChange={(e) => setNom(e.target.value)}
                                    placeholder="Ex: Centre Camille Pagé, Maison Pour Tous..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>
                                    Initiale (auto) *
                                </label>
                                <input
                                    type="text"
                                    value={initiale}
                                    onChange={(e) => setInitiale(e.target.value.substring(0, 3))}
                                    maxLength="3"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        textTransform: 'uppercase'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>
                                    Couleur
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="color"
                                        value={couleur}
                                        onChange={(e) => setCouleur(e.target.value)}
                                        style={{
                                            width: '50px',
                                            height: '42px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div style={{
                                        padding: '10px 15px',
                                        backgroundColor: couleur,
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        flex: 1,
                                        textAlign: 'center',
                                        fontSize: '14px'
                                    }}>
                                        {initiale || 'ABC'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Palette de couleurs prédéfinies */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                                Couleurs suggérées :
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {couleursPredefinies.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setCouleur(c)}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            backgroundColor: c,
                                            border: couleur === c ? '3px solid #1f2937' : '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
                                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                    />
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                disabled={isLoading || !canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: (isLoading || !canEdit) ? '#9ca3af' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                    opacity: !canEdit ? 0.6 : 1,
                                    fontWeight: '500'
                                }}
                            >
                                {isLoading ? 'Ajout...' : 'Ajouter'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAjouterForm(false)
                                    setNom('')
                                    setInitiale('')
                                    setCouleur('#3b82f6')
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Annuler
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Formulaire de modification */}
            {showModifierForm && lieuEnModification && (
                <div style={{
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    border: '2px solid #f59e0b'
                }}>
                    <h3 style={{ marginBottom: '15px', color: '#92400e' }}>
                        🎨 Modifier : {lieuEnModification.nom}
                    </h3>
                    <div style={{
                        backgroundColor: '#fbbf24',
                        color: '#92400e',
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '15px',
                        fontSize: '13px'
                    }}>
                        🔄 <strong>Mise à jour intelligente :</strong> Les initiales se recalculent automatiquement selon le nouveau nom.
                    </div>
                    <form onSubmit={handleSubmitModification}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 200px', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>
                                    Nom du lieu *
                                </label>
                                <input
                                    type="text"
                                    value={lieuEnModification.nom}
                                    onChange={(e) => {
                                        const newLieu = {...lieuEnModification, nom: e.target.value}
                                        const words = e.target.value.split(' ')
                                        let newInitiale = ''
                                        
                                        if (words.length >= 2) {
                                            newInitiale = words.slice(0, 3).map(w => w.charAt(0)).join('').toUpperCase()
                                        } else {
                                            newInitiale = e.target.value.substring(0, 3).toUpperCase()
                                        }
                                        
                                        setLieuEnModification({...newLieu, initiale: newInitiale})
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>
                                    Initiale *
                                </label>
                                <input
                                    type="text"
                                    value={lieuEnModification.initiale}
                                    onChange={(e) => setLieuEnModification({
                                        ...lieuEnModification, 
                                        initiale: e.target.value.substring(0, 3)
                                    })}
                                    maxLength="3"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        textTransform: 'uppercase'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>
                                    Couleur
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="color"
                                        value={lieuEnModification.couleur}
                                        onChange={(e) => setLieuEnModification({
                                            ...lieuEnModification,
                                            couleur: e.target.value
                                        })}
                                        style={{
                                            width: '50px',
                                            height: '42px',
                                            border: '1px solid #fbbf24',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div style={{
                                        padding: '10px 15px',
                                        backgroundColor: lieuEnModification.couleur,
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        flex: 1,
                                        textAlign: 'center',
                                        fontSize: '14px'
                                    }}>
                                        {lieuEnModification.initiale}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Palette de couleurs pour modification */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#92400e' }}>
                                Couleurs suggérées :
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {couleursPredefinies.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setLieuEnModification({
                                            ...lieuEnModification,
                                            couleur: c
                                        })}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            backgroundColor: c,
                                            border: lieuEnModification.couleur === c ? '3px solid #92400e' : '1px solid #fbbf24',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
                                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                    />
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                disabled={isLoading || !canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: (isLoading || !canEdit) ? '#9ca3af' : '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                    opacity: !canEdit ? 0.6 : 1,
                                    fontWeight: '500'
                                }}
                            >
                                {isLoading ? 'Modification...' : 'Modifier'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModifierForm(false)
                                    setLieuEnModification(null)
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Annuler
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tableau avec filtres */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
                {/* Header avec filtres et stats */}
                <div style={{
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <label style={{ fontWeight: '500', color: '#374151' }}>Afficher :</label>
                        <select
                            value={filtreStatut}
                            onChange={(e) => setFiltreStatut(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="actif">Lieux actifs</option>
                            <option value="archive">Lieux archivés</option>
                            <option value="tous">Tous les lieux</option>
                        </select>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                        <span style={{ 
                            padding: '5px 12px', 
                            backgroundColor: '#d1fae5', 
                            color: '#065f46',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            Actifs: {stats.actifs}
                        </span>
                        <span style={{ 
                            padding: '5px 12px', 
                            backgroundColor: '#f3f4f6', 
                            color: '#6b7280',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            Archivés: {stats.archives}
                        </span>
                        <span style={{ 
                            padding: '5px 12px', 
                            backgroundColor: '#ede9fe', 
                            color: '#7c3aed',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            Total: {stats.total}
                        </span>
                    </div>
                </div>

                {/* Tableau */}
                {lieux.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Statut</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Nom</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Initiale</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Couleur</th>
                                <th style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lieux.map((lieu) => (
                                <tr key={lieu.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            backgroundColor: lieu.archive ? '#f3f4f6' : '#d1fae5',
                                            color: lieu.archive ? '#6b7280' : '#065f46'
                                        }}>
                                            {lieu.archive ? '📦 Archivé' : '✅ Actif'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{lieu.nom}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '6px 10px',
                                            backgroundColor: lieu.couleur || '#3b82f6',
                                            color: 'white',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}>
                                            {lieu.initiale}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '30px',
                                                height: '30px',
                                                backgroundColor: lieu.couleur || '#3b82f6',
                                                borderRadius: '6px',
                                                border: '1px solid #d1d5db'
                                            }} />
                                            <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                                                {lieu.couleur || '#3b82f6'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {lieu.archive ? (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => initierAction(lieu, 'desarchiver')}
                                                    disabled={!canEdit}
                                                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: !canEdit ? '#94a3b8' : '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                        opacity: !canEdit ? 0.6 : 1
                                                    }}
                                                >
                                                    📤 Désarchiver
                                                </button>
                                                <button
                                                    onClick={() => initierAction(lieu, 'supprimer')}
                                                    disabled={!canEdit}
                                                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: !canEdit ? '#94a3b8' : '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                        opacity: !canEdit ? 0.6 : 1
                                                    }}
                                                >
                                                    🗑️ Supprimer
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => initierModification(lieu)}
                                                    disabled={!canEdit}
                                                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: !canEdit ? '#94a3b8' : '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                        opacity: !canEdit ? 0.6 : 1
                                                    }}
                                                >
                                                    🎨 Modifier
                                                </button>
                                                <button
                                                    onClick={() => initierAction(lieu, 'archiver')}
                                                    disabled={!canEdit}
                                                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: !canEdit ? '#94a3b8' : '#6b7280',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                        opacity: !canEdit ? 0.6 : 1
                                                    }}
                                                >
                                                    📦 Archiver
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <p style={{ color: '#9ca3af', fontSize: '16px' }}>
                            {filtreStatut === 'actif' && 'Aucun lieu actif trouvé.'}
                            {filtreStatut === 'archive' && 'Aucun lieu archivé trouvé.'}
                            {filtreStatut === 'tous' && 'Aucun lieu trouvé.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de confirmation */}
            {showConfirmation && actionEnCours && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '25px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>
                            Confirmer l'action
                        </h3>
                        <p style={{ marginBottom: '20px', color: '#6b7280', whiteSpace: 'pre-line' }}>
                            {actionEnCours.message}
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={executerAction}
                                disabled={isLoading || !canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: (isLoading || !canEdit) ? '#9ca3af' : (actionEnCours.type === 'supprimer' ? '#ef4444' : '#3b82f6'),
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                    cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                    opacity: !canEdit ? 0.6 : 1
                                }}
                            >
                                {isLoading ? 'En cours...' : 'Confirmer'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmation(false)
                                    setActionEnCours(null)
                                }}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                    cursor: isLoading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// 🛡️ PROTECTION AVEC HOC - Page titre personnalisé
export default withAuthAdmin(GestionLieux, "Gestion Lieux")