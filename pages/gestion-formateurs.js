import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function GestionFormateurs({ user, logout, inactivityTime, priority }) {
    const router = useRouter()

    // 🎯 MODE ÉDITION : Seulement le premier admin (vert) peut modifier
    const canEdit = priority === 1;

    // États
    const [formateurs, setFormateurs] = useState([])
    const [filtreStatut, setFiltreStatut] = useState('actif')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés
    
    // États formulaire ajout
    const [showAjouterForm, setShowAjouterForm] = useState(false)
    const [prenom, setPrenom] = useState('')
    const [nom, setNom] = useState('')
    
    // États formulaire modification
    const [formateurEnModification, setFormateurEnModification] = useState(null)
    const [showModifierForm, setShowModifierForm] = useState(false)
    
    // États pour confirmation
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [actionEnCours, setActionEnCours] = useState(null)

    useEffect(() => {
        fetchFormateurs()
    }, [filtreStatut])

    // 👥 Charger et écouter les admins connectés en temps réel
    useEffect(() => {
        if (!user) return;

        fetchConnectedAdmins();

        const channel = supabase
            .channel('admin_sessions_changes_gestion_formateurs')
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
        console.log('🔄 Priorité changée, rechargement formateurs...');
        fetchFormateurs();
    }, [priority]);

    // 👂 Écoute en temps réel des modifications des formateurs
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('users_formateurs_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users',
                filter: `role=eq.formateur`
            }, (payload) => {
                console.log('🔄 Modification users (formateurs) détectée, refresh...');
                fetchFormateurs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, filtreStatut]);

    // Fonction pour récupérer les formateurs
    const fetchFormateurs = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'formateur')
                .order('nom')

            if (error) throw error

            let formateursFiltres = data || []
            
            if (filtreStatut === 'actif') {
                formateursFiltres = data.filter(f => f.archive !== true)
            } else if (filtreStatut === 'archive') {
                formateursFiltres = data.filter(f => f.archive === true)
            }

            setFormateurs(formateursFiltres)
        } catch (error) {
            setMessage('Erreur lors du chargement des formateurs')
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

    /**
     * Normalise un prénom/nom pour créer un email valide
     * Supprime accents, cédilles et caractères spéciaux
     * José Martínez → jose martinez
     * François Müller → francois muller
     */
    const normalizeForEmail = (text) => {
        return text
            .toLowerCase()
            .trim()
            .normalize('NFD')                    // Décompose les caractères accentués
            .replace(/[\u0300-\u036f]/g, '')    // Supprime les marques diacritiques
            .replace(/[^a-z0-9]/g, '')          // Garde seulement lettres et chiffres
    }

    /**
     * Génère un email fictif sécurisé pour un formateur
     * Exemples :
     * - José Martínez → jose.martinez@formateur.aclef
     * - François Müller → francois.muller@formateur.aclef  
     * - Marie-Claude → marieclaud.@formateur.aclef (si nom vide)
     */
    const genererEmailFictif = (prenom, nom) => {
        const prenomNormalized = normalizeForEmail(prenom)
        const nomNormalized = normalizeForEmail(nom)
        return `${prenomNormalized}.${nomNormalized}@formateur.aclef`
    }

    // Fonction pour ajouter un formateur
    const handleSubmitAjout = async (e) => {
        e.preventDefault()
        
        if (!prenom.trim() || !nom.trim()) {
            setMessage('Le prénom et le nom sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            // Générer l'email fictif pour Supabase Auth
            const emailFictif = genererEmailFictif(prenom.trim(), nom.trim())
            
            const { error } = await supabase.from('users').insert([{
                prenom: prenom.trim(),
                nom: nom.trim(),
                email: emailFictif, // Email fictif pour l'authentification
                role: 'formateur',
                archive: false
            }])
            
            if (error) throw error
            
            setMessage(`Formateur ajouté avec succès !\n\nEmail fictif généré : ${emailFictif}\nIdentifiant: ${prenom} / Mot de passe: ${nom}\n\n⚠️ Le formateur devra changer son mot de passe lors de la première connexion.`)
            setTimeout(() => setMessage(''), 8000)
            
            // Réinitialiser le formulaire
            setPrenom('')
            setNom('')
            setShowAjouterForm(false)
            await fetchFormateurs()
            
        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Fonction pour modifier un formateur
    const handleSubmitModification = async (e) => {
        e.preventDefault()
        
        if (!formateurEnModification || !formateurEnModification.prenom.trim() || !formateurEnModification.nom.trim()) {
            setMessage('Le prénom et le nom sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            // Générer le nouvel email fictif si nécessaire
            const nouvelEmailFictif = genererEmailFictif(
                formateurEnModification.prenom.trim(),
                formateurEnModification.nom.trim()
            )
            
            const { error } = await supabase
                .from('users')
                .update({ 
                    prenom: formateurEnModification.prenom.trim(),
                    nom: formateurEnModification.nom.trim(),
                    email: nouvelEmailFictif
                })
                .eq('id', formateurEnModification.id)
            
            if (error) throw error
            
            setMessage('Formateur modifié avec succès !\n\nNouveau email fictif : ' + nouvelEmailFictif)
            setTimeout(() => setMessage(''), 6000)
            setFormateurEnModification(null)
            setShowModifierForm(false)
            await fetchFormateurs()
            
        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Initier la modification
    const initierModification = (formateur) => {
        setFormateurEnModification({...formateur})
        setShowModifierForm(true)
        setShowAjouterForm(false)
    }

    // Actions archiver/désarchiver/supprimer
    const initierAction = (formateur, typeAction) => {
        setActionEnCours({
            formateur: formateur,
            type: typeAction,
            message: getMessageConfirmation(formateur, typeAction)
        })
        setShowConfirmation(true)
    }

    const getMessageConfirmation = (formateur, typeAction) => {
        switch (typeAction) {
            case 'archiver':
                return `Archiver le formateur "${formateur.prenom} ${formateur.nom}" ?`
            case 'desarchiver':
                return `Désarchiver le formateur "${formateur.prenom} ${formateur.nom}" ?`
            case 'supprimer':
                return `Supprimer définitivement le formateur "${formateur.prenom} ${formateur.nom}" ?\n\nATTENTION : Action irréversible !`
            default:
                return 'Confirmer cette action ?'
        }
    }

    const executerAction = async () => {
        if (!actionEnCours) return

        setIsLoading(true)
        try {
            const { formateur, type } = actionEnCours

            if (type === 'archiver') {
                await supabase.from('users').update({ archive: true }).eq('id', formateur.id)
                setMessage('Formateur archivé avec succès !')
            } else if (type === 'desarchiver') {
                await supabase.from('users').update({ archive: false }).eq('id', formateur.id)
                setMessage('Formateur désarchivé avec succès !')
            } else if (type === 'supprimer') {
                await supabase.from('users').delete().eq('id', formateur.id)
                setMessage('Formateur supprimé définitivement !')
            }

            setTimeout(() => setMessage(''), 4000)
            await fetchFormateurs()

        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
            setActionEnCours(null)
            setShowConfirmation(false)
        }
    }

    // Compter les formateurs
    const compterFormateurs = () => {
        const actifs = formateurs.filter(f => !f.archive).length
        const archives = formateurs.filter(f => f.archive).length
        return { actifs, archives, total: formateurs.length }
    }

    const stats = compterFormateurs()

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
                    <span style={{ color: '#8b5cf6', fontWeight: '500' }}>Gestion des Formateurs</span>
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
                                {connectedAdmins.filter(admin => admin.email !== user?.email).map((admin, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 8px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '13px'
                                    }}>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: '#10b981',
                                            flexShrink: 0
                                        }} />
                                        <span style={{ color: '#374151', fontWeight: '500' }}>
                                            {admin.name}
                                        </span>
                                        {admin.currentPage && admin.currentPage !== '/' && (
                                            <span style={{
                                                fontSize: '11px',
                                                color: '#6b7280',
                                                backgroundColor: '#f3f4f6',
                                                padding: '1px 4px',
                                                borderRadius: '3px'
                                            }}>
                                                {admin.priority === 1 ? 'modifie' : 'consulte'} {admin.currentPage.replace('/', '').replace(/-/g, ' ')}
                                            </span>
                                        )}
                                    </div>
                                ))}
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
                    Gestion des Formateurs
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Gérez les formateurs et leurs accès au système
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
                    fontWeight: '500',
                    whiteSpace: 'pre-line'
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
                    onMouseOver={(e) => {
                        if (canEdit) e.target.style.transform = 'scale(1.02)'
                    }}
                    onMouseOut={(e) => {
                        if (canEdit) e.target.style.transform = 'scale(1)'
                    }}
                >
                    Ajouter un nouveau formateur
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
                    <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>Nouveau formateur</h3>
                    <div style={{
                        backgroundColor: '#dbeafe',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '15px'
                    }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
                            <strong>🔐 Système d'authentification :</strong>
                            <br />• Email fictif généré automatiquement : prenom.nom@formateur.aclef
                            <br />• Connexion : Identifiant = Prénom / Mot de passe = Nom
                            <br />• Changement de mot de passe obligatoire à la première connexion
                        </p>
                    </div>
                    <form onSubmit={handleSubmitAjout}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>
                                    Prénom * (sera l'identifiant)
                                </label>
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
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>
                                    Nom * (sera le mot de passe initial)
                                </label>
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
                        </div>
                        {prenom && nom && (
                            <div style={{
                                backgroundColor: '#f3f4f6',
                                padding: '10px',
                                borderRadius: '6px',
                                marginBottom: '15px',
                                fontSize: '13px'
                            }}>
                                <strong>📧 Email fictif qui sera généré :</strong> {genererEmailFictif(prenom, nom)}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                disabled={isLoading || !canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: (isLoading || !canEdit) ? '#94a3b8' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                    opacity: (isLoading || !canEdit) ? 0.6 : 1,
                                    fontWeight: '500'
                                }}
                            >
                                {isLoading ? 'Création...' : 'Créer le formateur'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAjouterForm(false)
                                    setPrenom('')
                                    setNom('')
                                }}
                                disabled={!canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: !canEdit ? '#94a3b8' : '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: !canEdit ? 'not-allowed' : 'pointer',
                                    opacity: !canEdit ? 0.6 : 1,
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
            {showModifierForm && formateurEnModification && (
                <div style={{
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    border: '2px solid #f59e0b'
                }}>
                    <h3 style={{ marginBottom: '15px', color: '#92400e' }}>
                        Modifier : {formateurEnModification.prenom} {formateurEnModification.nom}
                    </h3>
                    <div style={{
                        backgroundColor: '#fbbf24',
                        color: '#92400e',
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '15px',
                        fontSize: '13px'
                    }}>
                        ⚠️ <strong>Attention :</strong> Modifier le prénom/nom changera l'email fictif et peut affecter la connexion du formateur.
                    </div>
                    <form onSubmit={handleSubmitModification}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>
                                    Prénom * (identifiant)
                                </label>
                                <input
                                    type="text"
                                    value={formateurEnModification.prenom}
                                    onChange={(e) => setFormateurEnModification({
                                        ...formateurEnModification,
                                        prenom: e.target.value
                                    })}
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
                                    Nom * (mot de passe)
                                </label>
                                <input
                                    type="text"
                                    value={formateurEnModification.nom}
                                    onChange={(e) => setFormateurEnModification({
                                        ...formateurEnModification,
                                        nom: e.target.value
                                    })}
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
                        </div>
                        {formateurEnModification.prenom && formateurEnModification.nom && (
                            <div style={{
                                backgroundColor: '#fbbf24',
                                color: '#92400e',
                                padding: '10px',
                                borderRadius: '6px',
                                marginBottom: '15px',
                                fontSize: '13px'
                            }}>
                                <strong>📧 Nouvel email fictif :</strong> {genererEmailFictif(formateurEnModification.prenom, formateurEnModification.nom)}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                disabled={isLoading || !canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: (isLoading || !canEdit) ? '#94a3b8' : '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                    opacity: (isLoading || !canEdit) ? 0.6 : 1,
                                    fontWeight: '500'
                                }}
                            >
                                {isLoading ? 'Modification...' : 'Modifier'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModifierForm(false)
                                    setFormateurEnModification(null)
                                }}
                                disabled={!canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: !canEdit ? '#94a3b8' : '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: !canEdit ? 'not-allowed' : 'pointer',
                                    opacity: !canEdit ? 0.6 : 1,
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
                            <option value="actif">Formateurs actifs</option>
                            <option value="archive">Formateurs archivés</option>
                            <option value="tous">Tous les formateurs</option>
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
                {formateurs.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Statut</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Nom et prénom</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Email fictif</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Connexion</th>
                                <th style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formateurs.map((formateur) => (
                                <tr key={formateur.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            backgroundColor: formateur.archive ? '#f3f4f6' : '#d1fae5',
                                            color: formateur.archive ? '#6b7280' : '#065f46'
                                        }}>
                                            {formateur.archive ? 'Archivé' : 'Actif'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div>
                                            <div style={{ fontWeight: '500' }}>{formateur.nom} {formateur.prenom}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                                        {formateur.email || genererEmailFictif(formateur.prenom, formateur.nom)}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{
                                            backgroundColor: '#f3f4f6',
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontFamily: 'monospace'
                                        }}>
                                            <div>ID: <strong>{formateur.prenom}</strong></div>
                                            <div>MDP: <strong>{formateur.nom}</strong></div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {formateur.archive ? (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => initierAction(formateur, 'desarchiver')}
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
                                                    Désarchiver
                                                </button>
                                                <button
                                                    onClick={() => initierAction(formateur, 'supprimer')}
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
                                                    Supprimer
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => initierModification(formateur)}
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
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => initierAction(formateur, 'archiver')}
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
                                                    Archiver
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
                            {filtreStatut === 'actif' && 'Aucun formateur actif trouvé.'}
                            {filtreStatut === 'archive' && 'Aucun formateur archivé trouvé.'}
                            {filtreStatut === 'tous' && 'Aucun formateur trouvé.'}
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
                                    opacity: (isLoading || !canEdit) ? 0.6 : 1
                                }}
                            >
                                {isLoading ? 'En cours...' : 'Confirmer'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmation(false)
                                    setActionEnCours(null)
                                }}
                                disabled={isLoading || !canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: (isLoading || !canEdit) ? '#94a3b8' : '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                    cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                    opacity: (isLoading || !canEdit) ? 0.6 : 1
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
export default withAuthAdmin(GestionFormateurs, "Gestion Formateurs")