import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function GestionSalaries({ user, logout, inactivityTime }) {
    const router = useRouter()
    
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
                                                    📤 Désarchiver
                                                </button>
                                                <button
                                                    onClick={() => initierAction(salarie, 'supprimer')}
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
                                                    🗑️ Supprimer
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => initierModification(salarie)}
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
                                                    ✏️ Modifier
                                                </button>
                                                <button
                                                    onClick={() => initierAction(salarie, 'archiver')}
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
export default withAuthAdmin(GestionSalaries, "Gestion Salariés")