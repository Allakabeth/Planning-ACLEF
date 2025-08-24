import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function GestionFormateurs({ user, logout, inactivityTime }) {
    const router = useRouter()
    
    // États
    const [formateurs, setFormateurs] = useState([])
    const [filtreStatut, setFiltreStatut] = useState('actif')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    
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

    // Fonction pour générer l'email fictif
    const genererEmailFictif = (prenom, nom) => {
        const prenomClean = prenom.toLowerCase().replace(/[^a-z]/g, '')
        const nomClean = nom.toLowerCase().replace(/[^a-z]/g, '')
        return `${prenomClean}.${nomClean}@formateur.aclef`
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
                    
                    <div style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: inactivityTime >= 240 ? '#fee2e2' : inactivityTime >= 180 ? '#fef3c7' : '#d1fae5',
                        color: inactivityTime >= 240 ? '#dc2626' : inactivityTime >= 180 ? '#d97706' : '#059669',
                        border: `1px solid ${inactivityTime >= 240 ? '#fca5a5' : inactivityTime >= 180 ? '#fcd34d' : '#6ee7b7'}`
                    }}>
                        Status : {inactivityTime >= 300 ? '😴 ENDORMI!' : 
                                 inactivityTime >= 240 ? `⚠️ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
                                 inactivityTime >= 180 ? `⏰ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
                                 `🟢 ACTIF`}
                    </div>
                    
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
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
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
                                disabled={isLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: isLoading ? '#9ca3af' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
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
                                disabled={isLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: isLoading ? '#9ca3af' : '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
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
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Désarchiver
                                                </button>
                                                <button
                                                    onClick={() => initierAction(formateur, 'supprimer')}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => initierModification(formateur)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => initierAction(formateur, 'archiver')}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#6b7280',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
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
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: actionEnCours.type === 'supprimer' ? '#ef4444' : '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                    cursor: isLoading ? 'not-allowed' : 'pointer'
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
export default withAuthAdmin(GestionFormateurs, "Gestion Formateurs")