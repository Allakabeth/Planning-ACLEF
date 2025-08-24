import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function GestionApprenants({ user, logout, inactivityTime }) {
    const router = useRouter()
    
    // États
    const [apprenants, setApprenants] = useState([])
    const [filtreStatut, setFiltreStatut] = useState('actif')
    const [filtreDispositif, setFiltreDispositif] = useState('tous')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    
    // États formulaire ajout
    const [showAjouterForm, setShowAjouterForm] = useState(false)
    const [prenom, setPrenom] = useState('')
    const [nom, setNom] = useState('')
    const [dispositif, setDispositif] = useState('HSP')
    
    // États formulaire modification
    const [apprenantEnModification, setApprenantEnModification] = useState(null)
    const [showModifierForm, setShowModifierForm] = useState(false)
    
    // États pour confirmation
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [actionEnCours, setActionEnCours] = useState(null)

    useEffect(() => {
        fetchApprenants()
    }, [filtreStatut, filtreDispositif])

    // Fonction pour récupérer les apprenants
    const fetchApprenants = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'apprenant')
                .order('nom')

            if (error) throw error

            let apprenantsFiltres = data || []
            
            // Filtre par statut
            if (filtreStatut === 'actif') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.archive !== true)
            } else if (filtreStatut === 'archive') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.archive === true)
            }
            
            // Filtre par dispositif
            if (filtreDispositif === 'HSP') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.dispositif === 'HSP')
            } else if (filtreDispositif === 'OPCO') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.dispositif === 'OPCO')
            }

            setApprenants(apprenantsFiltres)
        } catch (error) {
            setMessage('Erreur lors du chargement des apprenants')
            console.error(error)
        }
    }

    // Fonction pour ajouter un apprenant
    const handleSubmitAjout = async (e) => {
        e.preventDefault()
        
        if (!prenom.trim() || !nom.trim()) {
            setMessage('Le prénom et le nom sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase.from('users').insert([{
                prenom: prenom.trim(),
                nom: nom.trim(),
                dispositif: dispositif,
                role: 'apprenant',
                archive: false
            }])
            
            if (error) throw error
            
            setMessage('Apprenant ajouté avec succès !')
            setTimeout(() => setMessage(''), 4000)
            
            // Réinitialiser le formulaire
            setPrenom('')
            setNom('')
            setDispositif('HSP')
            setShowAjouterForm(false)
            await fetchApprenants()
            
        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Fonction pour modifier un apprenant
    const handleSubmitModification = async (e) => {
        e.preventDefault()
        
        if (!apprenantEnModification || !apprenantEnModification.prenom.trim() || !apprenantEnModification.nom.trim()) {
            setMessage('Le prénom et le nom sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({ 
                    prenom: apprenantEnModification.prenom.trim(),
                    nom: apprenantEnModification.nom.trim(),
                    dispositif: apprenantEnModification.dispositif
                })
                .eq('id', apprenantEnModification.id)
            
            if (error) throw error
            
            setMessage('Apprenant modifié avec succès !')
            setTimeout(() => setMessage(''), 4000)
            setApprenantEnModification(null)
            setShowModifierForm(false)
            await fetchApprenants()
            
        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Initier la modification
    const initierModification = (apprenant) => {
        setApprenantEnModification({...apprenant})
        setShowModifierForm(true)
        setShowAjouterForm(false)
    }

    // Actions archiver/désarchiver/supprimer
    const initierAction = (apprenant, typeAction) => {
        setActionEnCours({
            apprenant: apprenant,
            type: typeAction,
            message: getMessageConfirmation(apprenant, typeAction)
        })
        setShowConfirmation(true)
    }

    const getMessageConfirmation = (apprenant, typeAction) => {
        switch (typeAction) {
            case 'archiver':
                return `Archiver l'apprenant "${apprenant.prenom} ${apprenant.nom}" ?`
            case 'desarchiver':
                return `Désarchiver l'apprenant "${apprenant.prenom} ${apprenant.nom}" ?`
            case 'supprimer':
                return `Supprimer définitivement l'apprenant "${apprenant.prenom} ${apprenant.nom}" ?\n\nATTENTION : Action irréversible !`
            default:
                return 'Confirmer cette action ?'
        }
    }

    const executerAction = async () => {
        if (!actionEnCours) return

        setIsLoading(true)
        try {
            const { apprenant, type } = actionEnCours

            if (type === 'archiver') {
                await supabase.from('users').update({ archive: true }).eq('id', apprenant.id)
                setMessage('Apprenant archivé avec succès !')
            } else if (type === 'desarchiver') {
                await supabase.from('users').update({ archive: false }).eq('id', apprenant.id)
                setMessage('Apprenant désarchivé avec succès !')
            } else if (type === 'supprimer') {
                await supabase.from('users').delete().eq('id', apprenant.id)
                setMessage('Apprenant supprimé définitivement !')
            }

            setTimeout(() => setMessage(''), 4000)
            await fetchApprenants()

        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
            setActionEnCours(null)
            setShowConfirmation(false)
        }
    }

    // Compter les apprenants
    const compterApprenants = () => {
        const tous = apprenants.length
        const actifs = apprenants.filter(a => !a.archive).length
        const archives = apprenants.filter(a => a.archive).length
        const hsp = apprenants.filter(a => a.dispositif === 'HSP' && !a.archive).length
        const opco = apprenants.filter(a => a.dispositif === 'OPCO' && !a.archive).length
        return { tous, actifs, archives, hsp, opco }
    }

    const stats = compterApprenants()

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
                    <span style={{ color: '#3b82f6', fontWeight: '500' }}>Gestion des Apprenants</span>
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
                    Gestion des Apprenants
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Gérez les apprenants et leur dispositif de financement
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
                    Ajouter un nouvel apprenant
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
                    <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>Nouvel apprenant</h3>
                    <form onSubmit={handleSubmitAjout} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px 150px', gap: '15px', alignItems: 'end' }}>
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
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Dispositif</label>
                            <select
                                value={dispositif}
                                onChange={(e) => setDispositif(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="HSP">HSP</option>
                                <option value="OPCO">OPCO</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                padding: '10px',
                                backgroundColor: isLoading ? '#9ca3af' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            {isLoading ? '...' : 'Ajouter'}
                        </button>
                    </form>
                </div>
            )}

            {/* Formulaire de modification */}
            {showModifierForm && apprenantEnModification && (
                <div style={{
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    border: '2px solid #f59e0b'
                }}>
                    <h3 style={{ marginBottom: '15px', color: '#92400e' }}>
                        Modifier : {apprenantEnModification.prenom} {apprenantEnModification.nom}
                    </h3>
                    <form onSubmit={handleSubmitModification} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px 150px', gap: '15px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Prénom *</label>
                            <input
                                type="text"
                                value={apprenantEnModification.prenom}
                                onChange={(e) => setApprenantEnModification({...apprenantEnModification, prenom: e.target.value})}
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
                                value={apprenantEnModification.nom}
                                onChange={(e) => setApprenantEnModification({...apprenantEnModification, nom: e.target.value})}
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
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Dispositif</label>
                            <select
                                value={apprenantEnModification.dispositif || 'HSP'}
                                onChange={(e) => setApprenantEnModification({...apprenantEnModification, dispositif: e.target.value})}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #fbbf24',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="HSP">HSP</option>
                                <option value="OPCO">OPCO</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                padding: '10px',
                                backgroundColor: isLoading ? '#9ca3af' : '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
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
                {/* Header avec double filtre et stats */}
                <div style={{
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#374151' }}>Statut :</label>
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
                                <option value="actif">Apprenants actifs</option>
                                <option value="archive">Apprenants archivés</option>
                                <option value="tous">Tous les apprenants</option>
                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#374151' }}>Dispositif :</label>
                            <select
                                value={filtreDispositif}
                                onChange={(e) => setFiltreDispositif(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="tous">Tous</option>
                                <option value="HSP">HSP uniquement</option>
                                <option value="OPCO">OPCO uniquement</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Statistiques */}
                    <div style={{ display: 'flex', gap: '20px', fontSize: '14px', justifyContent: 'center' }}>
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
                            backgroundColor: '#dbeafe', 
                            color: '#1e40af',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            HSP: {stats.hsp}
                        </span>
                        <span style={{ 
                            padding: '5px 12px', 
                            backgroundColor: '#fef3c7', 
                            color: '#92400e',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            OPCO: {stats.opco}
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
                            Total: {stats.tous}
                        </span>
                    </div>
                </div>

                {/* Tableau */}
                {apprenants.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Statut</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Prénom</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Nom</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Dispositif</th>
                                <th style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apprenants.map((apprenant) => (
                                <tr key={apprenant.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            backgroundColor: apprenant.archive ? '#f3f4f6' : '#d1fae5',
                                            color: apprenant.archive ? '#6b7280' : '#065f46'
                                        }}>
                                            {apprenant.archive ? 'Archivé' : 'Actif'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{apprenant.prenom}</td>
                                    <td style={{ padding: '12px' }}>{apprenant.nom}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            backgroundColor: apprenant.dispositif === 'HSP' ? '#dbeafe' : '#fef3c7',
                                            color: apprenant.dispositif === 'HSP' ? '#1e40af' : '#92400e'
                                        }}>
                                            {apprenant.dispositif || 'HSP'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {apprenant.archive ? (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => initierAction(apprenant, 'desarchiver')}
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
                                                    onClick={() => initierAction(apprenant, 'supprimer')}
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
                                                    onClick={() => initierModification(apprenant)}
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
                                                    onClick={() => initierAction(apprenant, 'archiver')}
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
                            Aucun apprenant trouvé avec ces critères.
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
export default withAuthAdmin(GestionApprenants, "Gestion Apprenants")