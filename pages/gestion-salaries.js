import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function GestionSalaries({ user, logout, inactivityTime, priority }) {
    const router = useRouter()

    // 🎯 MODE ÉDITION : Seulement le premier admin (vert) peut modifier
    const canEdit = priority === 1;

    // États
    const [salaries, setSalaries] = useState([])
    const [filtreStatut, setFiltreStatut] = useState('actif')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    
    // États formulaire ajout
    const [showAjouterForm, setShowAjouterForm] = useState(false)
    const [prenom, setPrenom] = useState('')
    const [nom, setNom] = useState('')
    const [initiales, setInitiales] = useState('')

    // États formulaire modification
    const [salarieEnModification, setSalarieEnModification] = useState(null)
    const [showModifierForm, setShowModifierForm] = useState(false)

    // États pour confirmation
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [actionEnCours, setActionEnCours] = useState(null)

    const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés

    useEffect(() => {
        fetchSalaries()
    }, [filtreStatut])

    // Auto-génération des initiales
    useEffect(() => {
        if (prenom && nom) {
            const initialesAuto = (prenom.charAt(0) + nom.charAt(0)).toUpperCase()
            setInitiales(initialesAuto)
        }
    }, [prenom, nom])

    // 👥 Charger et écouter les admins connectés en temps réel
    useEffect(() => {
        if (!user) return;

        fetchConnectedAdmins();

        const channel = supabase
            .channel('admin_sessions_changes_gestion_salaries')
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
        console.log('🔄 Priorité changée, rechargement salaries...');
        fetchSalaries();
    }, [priority]);

    // 👂 Écoute en temps réel des modifications des salariés
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('users_salaries_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users',
                filter: `role=eq.salarie`
            }, (payload) => {
                console.log('🔄 Modification users (salariés) détectée, refresh...');
                fetchSalaries();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, filtreStatut]);

    // Fonction pour récupérer les salariés
    const fetchSalaries = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'salarié')
                .order('nom')

            if (error) throw error

            let salariesFiltres = data || []

            if (filtreStatut === 'actif') {
                salariesFiltres = data.filter(s => s.archive !== true)
            } else if (filtreStatut === 'archive') {
                salariesFiltres = data.filter(s => s.archive === true)
            }

            setSalaries(salariesFiltres)
        } catch (error) {
            setMessage('❌ Erreur lors du chargement des salariés')
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

    // Fonction pour ajouter un salarié
    const handleSubmitAjout = async (e) => {
        e.preventDefault()
        
        if (!prenom.trim() || !nom.trim()) {
            setMessage('❌ Le prénom et le nom sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase.from('users').insert([{
                prenom: prenom.trim(),
                nom: nom.trim(),
                initiales: initiales.trim(),
                role: 'salarié',
                archive: false
            }])
            
            if (error) throw error
            
            setMessage('✅ Salarié ajouté avec succès !')
            setTimeout(() => setMessage(''), 4000)
            
            // Réinitialiser le formulaire
            setPrenom('')
            setNom('')
            setInitiales('')
            setShowAjouterForm(false)
            await fetchSalaries()
            
        } catch (error) {
            setMessage(`❌ Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Fonction pour modifier un salarié
    const handleSubmitModification = async (e) => {
        e.preventDefault()
        
        if (!salarieEnModification || !salarieEnModification.prenom.trim() || !salarieEnModification.nom.trim()) {
            setMessage('❌ Le prénom et le nom sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({ 
                    prenom: salarieEnModification.prenom.trim(),
                    nom: salarieEnModification.nom.trim(),
                    initiales: salarieEnModification.initiales.trim(),
                })
                .eq('id', salarieEnModification.id)
            
            if (error) throw error
            
            setMessage('✅ Salarié modifié avec succès !')
            setTimeout(() => setMessage(''), 4000)
            setSalarieEnModification(null)
            setShowModifierForm(false)
            await fetchSalaries()
            
        } catch (error) {
            setMessage(`❌ Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Initier la modification
    const initierModification = (salarie) => {
        setSalarieEnModification({...salarie})
        setShowModifierForm(true)
        setShowAjouterForm(false)
    }

    // Actions archiver/désarchiver/supprimer
    const initierAction = (salarie, typeAction) => {
        setActionEnCours({
            salarie: salarie,
            type: typeAction,
            message: getMessageConfirmation(salarie, typeAction)
        })
        setShowConfirmation(true)
    }

    const getMessageConfirmation = (salarie, typeAction) => {
        switch (typeAction) {
            case 'archiver':
                return `Archiver le salarié "${salarie.prenom} ${salarie.nom}" ?`
            case 'desarchiver':
                return `Désarchiver le salarié "${salarie.prenom} ${salarie.nom}" ?`
            case 'supprimer':
                return `Supprimer définitivement le salarié "${salarie.prenom} ${salarie.nom}" ?\n\n⚠️ ATTENTION : Action irréversible !`
            default:
                return 'Confirmer cette action ?'
        }
    }

    const executerAction = async () => {
        if (!actionEnCours) return

        setIsLoading(true)
        try {
            const { salarie, type } = actionEnCours

            if (type === 'archiver') {
                await supabase.from('users').update({ archive: true }).eq('id', salarie.id)
                setMessage('✅ Salarié archivé avec succès !')
            } else if (type === 'desarchiver') {
                await supabase.from('users').update({ archive: false }).eq('id', salarie.id)
                setMessage('✅ Salarié désarchivé avec succès !')
            } else if (type === 'supprimer') {
                await supabase.from('users').delete().eq('id', salarie.id)
                setMessage('✅ Salarié supprimé définitivement !')
            }

            setTimeout(() => setMessage(''), 4000)
            await fetchSalaries()

        } catch (error) {
            setMessage(`❌ Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
            setActionEnCours(null)
            setShowConfirmation(false)
        }
    }

    // Compter les salariés
    const compterSalaries = () => {
        const actifs = salaries.filter(s => !s.archive).length
        const archives = salaries.filter(s => s.archive).length
        return { actifs, archives, total: salaries.length }
    }

    const stats = compterSalaries()

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
                    <span style={{ color: '#8b5cf6', fontWeight: '500' }}>Gestion des Salariés</span>
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
                            height: '30px',
                            width: '1px',
                            backgroundColor: '#e5e7eb'
                        }} />

                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            flex: 1
                        }}>
                            {connectedAdmins.map((admin, index) => {
                                const isOnThisPage = admin.currentPage === 'gestion-salaries';
                                const verb = admin.priority === 1 ? 'modifie' : 'consulte';

                                return (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '5px 12px',
                                            backgroundColor: isOnThisPage ? '#f3f4f6' : 'transparent',
                                            borderRadius: '20px',
                                            fontSize: '13px',
                                            color: '#4b5563'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            backgroundColor: admin.priority === 1 ? '#10b981' : admin.priority === 2 ? '#f59e0b' : '#dc2626',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}>
                                            {admin.priority}
                                        </div>
                                        <span style={{ fontWeight: isOnThisPage ? '600' : '400' }}>
                                            {admin.name} {isOnThisPage && `${verb} cette page`}
                                        </span>
                                    </div>
                                );
                            })}
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
                    Gestion des Salariés
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Ajoutez, modifiez et gérez les salariés de l'organisation
                </p>
            </div>

            {/* Message de notification */}
            {message && (
                <div style={{
                    backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
                    color: message.includes('✅') ? '#065f46' : '#991b1b',
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
                    ➕ Ajouter un nouveau salarié
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
                    <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>Nouveau salarié</h3>
                    <div style={{
                        backgroundColor: '#e0f2fe',
                        border: '1px solid #06b6d4',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '15px'
                    }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#0891b2' }}>
                            <strong>🔤 Génération automatique d'initiales :</strong> Les initiales sont générées automatiquement à partir de la première lettre du prénom et du nom.
                        </p>
                    </div>
                    <form onSubmit={handleSubmitAjout} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px 150px', gap: '15px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Prénom *</label>
                            <input
                                type="text"
                                value={prenom}
                                onChange={(e) => setPrenom(e.target.value)}
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
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Nom *</label>
                            <input
                                type="text"
                                value={nom}
                                onChange={(e) => setNom(e.target.value)}
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
                                Initiales (auto)
                            </label>
                            <div style={{
                                padding: '10px',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                color: 'white',
                                borderRadius: '8px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}>
                                {initiales || '--'}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !canEdit}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                            style={{
                                padding: '10px',
                                backgroundColor: (isLoading || !canEdit) ? '#9ca3af' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                opacity: !canEdit ? 0.6 : 1,
                                fontWeight: '500'
                            }}
                        >
                            {isLoading ? '...' : 'Ajouter'}
                        </button>
                    </form>
                </div>
            )}

            {/* Formulaire de modification */}
            {showModifierForm && salarieEnModification && (
                <div style={{
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    border: '2px solid #f59e0b'
                }}>
                    <h3 style={{ marginBottom: '15px', color: '#92400e' }}>
                        ✏️ Modifier : {salarieEnModification.prenom} {salarieEnModification.nom}
                    </h3>
                    <div style={{
                        backgroundColor: '#fbbf24',
                        color: '#92400e',
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '15px',
                        fontSize: '13px'
                    }}>
                        🔄 <strong>Mise à jour automatique :</strong> Les initiales se mettent à jour automatiquement lors de la modification du prénom ou nom.
                    </div>
                    <form onSubmit={handleSubmitModification} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px 150px', gap: '15px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Prénom *</label>
                            <input
                                type="text"
                                value={salarieEnModification.prenom}
                                onChange={(e) => {
                                    const newSalarie = {...salarieEnModification, prenom: e.target.value}
                                    const newInitiales = (e.target.value.charAt(0) + newSalarie.nom.charAt(0)).toUpperCase()
                                    setSalarieEnModification({...newSalarie, initiales: newInitiales})
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
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Nom *</label>
                            <input
                                type="text"
                                value={salarieEnModification.nom}
                                onChange={(e) => {
                                    const newSalarie = {...salarieEnModification, nom: e.target.value}
                                    const newInitiales = (newSalarie.prenom.charAt(0) + e.target.value.charAt(0)).toUpperCase()
                                    setSalarieEnModification({...newSalarie, initiales: newInitiales})
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
                                Initiales
                            </label>
                            <div style={{
                                padding: '10px',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                color: 'white',
                                borderRadius: '8px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}>
                                {salarieEnModification.initiales || '--'}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !canEdit}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                            style={{
                                padding: '10px',
                                backgroundColor: (isLoading || !canEdit) ? '#9ca3af' : '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                opacity: !canEdit ? 0.6 : 1,
                                fontWeight: '500'
                            }}
                        >
                            {isLoading ? '...' : 'Modifier'}
                        </button>
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
                            <option value="actif">Salariés actifs</option>
                            <option value="archive">Salariés archivés</option>
                            <option value="tous">Tous les salariés</option>
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
                {salaries.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Statut</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Prénom</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Nom</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Initiales</th>
                                <th style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salaries.map((salarie) => (
                                <tr key={salarie.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            backgroundColor: salarie.archive ? '#f3f4f6' : '#d1fae5',
                                            color: salarie.archive ? '#6b7280' : '#065f46'
                                        }}>
                                            {salarie.archive ? '📦 Archivé' : '✅ Actif'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{salarie.prenom}</td>
                                    <td style={{ padding: '12px' }}>{salarie.nom}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '6px 10px',
                                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                            color: 'white',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}>
                                            {salarie.initiales || '--'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {salarie.archive ? (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => initierAction(salarie, 'desarchiver')}
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
                                                    onClick={() => initierAction(salarie, 'supprimer')}
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
                                                    onClick={() => initierModification(salarie)}
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
                                                    ✏️ Modifier
                                                </button>
                                                <button
                                                    onClick={() => initierAction(salarie, 'archiver')}
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
                            {filtreStatut === 'actif' && 'Aucun salarié actif trouvé.'}
                            {filtreStatut === 'archive' && 'Aucun salarié archivé trouvé.'}
                            {filtreStatut === 'tous' && 'Aucun salarié trouvé.'}
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
                                    backgroundColor: (isLoading || !canEdit) ? '#94a3b8' : (actionEnCours.type === 'supprimer' ? '#ef4444' : '#3b82f6'),
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
export default withAuthAdmin(GestionSalaries, "Gestion Salariés")