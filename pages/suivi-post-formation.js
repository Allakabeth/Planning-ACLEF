import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function SuiviPostFormation({ user, logout, inactivityTime, priority }) {
    const router = useRouter()
    const canEdit = priority === 1

    const [suivis, setSuivis] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [filtre, setFiltre] = useState('tous')
    const [modalNotes, setModalNotes] = useState(null)
    const [modalReponses, setModalReponses] = useState(null)

    useEffect(() => { fetchSuivis() }, [])

    const fetchSuivis = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('suivi_post_formation')
            .select(`
                *,
                apprenant:apprenant_id (id, prenom, nom),
                quest_sat:satisfaction_questionnaire_id (id, token, short_code, statut, reponses),
                quest_3mois:suivi_3mois_questionnaire_id (id, token, short_code, statut, reponses),
                quest_6mois:suivi_6mois_questionnaire_id (id, token, short_code, statut, reponses)
            `)
            .order('created_at', { ascending: false })

        if (!error && data) setSuivis(data)
        setIsLoading(false)
    }

    // Ouvrir WhatsApp avec message pre-ecrit
    const envoyerWhatsApp = (prenom, token, typeMsg) => {
        const baseUrl = window.location.origin
        const lien = baseUrl + '/q/' + token
        let msg = ''
        if (typeMsg === 'satisfaction') {
            msg = 'Bonjour ' + prenom + ' !\n\nL\'ACLEF aimerait avoir votre avis sur la formation.\n\nCliquez ici pour repondre (2 minutes) :\n' + lien + '\n\nMerci !'
        } else if (typeMsg === 'relance') {
            msg = 'Bonjour ' + prenom + ' !\n\nVous n\'avez pas encore donne votre avis. Ca prend 2 minutes :\n' + lien + '\n\nMerci !'
        } else if (typeMsg === 'suivi_3mois') {
            msg = 'Bonjour ' + prenom + ' !\n\nCa fait 3 mois que vous avez termine votre formation a l\'ACLEF.\nComment allez-vous ? Repondez en 2 minutes :\n' + lien + '\n\nMerci !'
        } else if (typeMsg === 'suivi_6mois') {
            msg = 'Bonjour ' + prenom + ' !\n\nCa fait 6 mois que vous avez termine votre formation a l\'ACLEF.\nDonnez-nous de vos nouvelles (2 minutes) :\n' + lien + '\n\nMerci !'
        }
        window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank')
    }

    // Marquer comme envoye apres clic WhatsApp
    const marquerEnvoye = async (suiviId, champ) => {
        const updates = { updated_at: new Date().toISOString() }
        if (champ === 'satisfaction') {
            updates.satisfaction_statut = 'envoye'
            updates.satisfaction_date_envoi = new Date().toISOString()
        } else if (champ === '3mois') {
            updates.suivi_3mois_statut = 'envoye'
        } else if (champ === '6mois') {
            updates.suivi_6mois_statut = 'envoye'
        }
        await supabase.from('suivi_post_formation').update(updates).eq('id', suiviId)
        await fetchSuivis()
    }

    // Bouton WhatsApp + marquer envoye
    const handleWhatsApp = (suiviId, prenom, token, typeMsg, champ) => {
        envoyerWhatsApp(prenom, token, typeMsg)
        marquerEnvoye(suiviId, champ)
        setMessage('WhatsApp ouvert - marque comme envoye')
        setTimeout(() => setMessage(''), 3000)
    }

    // Marquer appel effectue
    const sauvegarderAppel = async () => {
        if (!modalNotes) return
        const updates = { updated_at: new Date().toISOString() }
        if (modalNotes.champ === 'satisfaction') {
            updates.satisfaction_statut = 'appel_effectue'
        } else if (modalNotes.champ === '3mois') {
            updates.suivi_3mois_statut = 'appel_effectue'
            updates.suivi_3mois_notes = modalNotes.notes
        } else if (modalNotes.champ === '6mois') {
            updates.suivi_6mois_statut = 'appel_effectue'
            updates.suivi_6mois_notes = modalNotes.notes
        }

        await supabase.from('suivi_post_formation').update(updates).eq('id', modalNotes.suiviId)
        setModalNotes(null)
        setMessage('Appel enregistre')
        setTimeout(() => setMessage(''), 3000)
        await fetchSuivis()
    }

    // Marquer injoignable
    const marquerInjoignable = async (suiviId, champ) => {
        const updates = { updated_at: new Date().toISOString() }
        if (champ === 'satisfaction') updates.satisfaction_statut = 'injoignable'
        else if (champ === '3mois') updates.suivi_3mois_statut = 'injoignable'
        else if (champ === '6mois') updates.suivi_6mois_statut = 'injoignable'

        await supabase.from('suivi_post_formation').update(updates).eq('id', suiviId)
        setMessage('Marque injoignable')
        setTimeout(() => setMessage(''), 3000)
        await fetchSuivis()
    }

    // Style badge selon statut
    const getStatutBadge = (statut) => {
        const styles = {
            'a_envoyer': { bg: '#fef3c7', color: '#92400e', label: 'A envoyer' },
            'envoye': { bg: '#dbeafe', color: '#1e40af', label: 'Envoye' },
            'relance_1': { bg: '#ffedd5', color: '#c2410c', label: 'Relancer' },
            'relance': { bg: '#ffedd5', color: '#c2410c', label: 'Relancer' },
            'appeler': { bg: '#fee2e2', color: '#991b1b', label: 'APPELER' },
            'appel_effectue': { bg: '#d1fae5', color: '#065f46', label: 'Appele' },
            'repondu': { bg: '#d1fae5', color: '#065f46', label: 'Repondu' },
            'injoignable': { bg: '#f3e8ff', color: '#6b21a8', label: 'Injoignable' },
            'a_venir': { bg: '#f1f5f9', color: '#475569', label: 'A venir' }
        }
        return styles[statut] || { bg: '#f1f5f9', color: '#475569', label: statut }
    }

    // Filtrer
    const estTermine = (s) => {
        const done = ['repondu', 'appel_effectue', 'injoignable']
        return done.includes(s.satisfaction_statut) && done.includes(s.suivi_3mois_statut) && done.includes(s.suivi_6mois_statut)
    }
    const aAction = (s) => {
        const urgents = ['a_envoyer', 'relance_1', 'relance', 'appeler']
        return urgents.includes(s.satisfaction_statut) || urgents.includes(s.suivi_3mois_statut) || urgents.includes(s.suivi_6mois_statut)
    }

    const suivisFiltres = suivis.filter(s => {
        if (filtre === 'tous') return true
        if (filtre === 'action') return aAction(s)
        if (filtre === 'termines') return estTermine(s)
        if (filtre === 'en_attente') return !estTermine(s) && !aAction(s)
        return true
    })

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'

    // Rendu d'une cellule de suivi (satisfaction, 3mois, 6mois)
    const renderCelluleSuivi = (s, statut, date, questionnaire, champ, typeMsg) => {
        const badge = getStatutBadge(statut)
        const prenom = s.apprenant?.prenom || ''
        const token = questionnaire?.short_code || questionnaire?.token

        return (
            <td style={tdStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {date && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDate(date)}</span>}
                    <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
                        fontSize: '11px', fontWeight: '700', backgroundColor: badge.bg, color: badge.color,
                        textAlign: 'center'
                    }}>
                        {badge.label}
                    </span>
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {/* Bouton WhatsApp */}
                        {['a_envoyer', 'relance_1', 'relance'].includes(statut) && token && (
                            <button
                                onClick={() => handleWhatsApp(s.id, prenom, token, typeMsg, champ)}
                                disabled={!canEdit}
                                style={btnSmall('#25D366', canEdit)}
                                title="Envoyer par WhatsApp"
                            >
                                WhatsApp
                            </button>
                        )}
                        {/* Bouton Appeler */}
                        {['appeler', 'relance_1', 'relance'].includes(statut) && (
                            <button
                                onClick={() => setModalNotes({ suiviId: s.id, champ, notes: '' })}
                                disabled={!canEdit}
                                style={btnSmall('#f59e0b', canEdit)}
                                title="Marquer appel effectue"
                            >
                                Tel
                            </button>
                        )}
                        {/* Bouton Injoignable */}
                        {statut === 'appeler' && (
                            <button
                                onClick={() => marquerInjoignable(s.id, champ)}
                                disabled={!canEdit}
                                style={btnSmall('#8b5cf6', canEdit)}
                                title="Marquer injoignable"
                            >
                                Inj.
                            </button>
                        )}
                        {/* Bouton Voir reponses */}
                        {questionnaire?.statut === 'complete' && (
                            <button
                                onClick={() => setModalReponses(questionnaire.reponses)}
                                style={btnSmall('#3b82f6', true)}
                            >
                                Voir
                            </button>
                        )}
                    </div>
                </div>
            </td>
        )
    }

    const labelReponse = (val) => {
        const labels = { 'oui': 'OUI', 'un_peu': 'UN PEU', 'non': 'NON', 'formation': 'En formation', 'emploi': 'En emploi', 'recherche': 'En recherche', 'autre': 'Autre' }
        return labels[val] || val
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px' }}>
                            Suivi Post-Formation
                        </h1>
                        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                            Satisfaction + Rappels 3 et 6 mois
                        </p>
                    </div>
                    <button onClick={() => router.push('/')} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                        Retour
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#d1fae5', borderRadius: '8px', marginBottom: '16px', color: '#065f46', fontWeight: '600', fontSize: '14px' }}>
                        {message}
                    </div>
                )}

                {/* Filtres */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[
                        { val: 'tous', label: 'Tous', count: suivis.length },
                        { val: 'action', label: 'Action requise', count: suivis.filter(aAction).length },
                        { val: 'en_attente', label: 'En attente', count: suivis.filter(s => !estTermine(s) && !aAction(s)).length },
                        { val: 'termines', label: 'Termines', count: suivis.filter(estTermine).length }
                    ].map(f => (
                        <button key={f.val} onClick={() => setFiltre(f.val)}
                            style={{
                                padding: '8px 16px', borderRadius: '20px',
                                border: filtre === f.val ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                                backgroundColor: filtre === f.val ? '#dbeafe' : 'white',
                                color: filtre === f.val ? '#1e40af' : '#64748b',
                                cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                            }}
                        >
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>

                {/* Tableau */}
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Chargement...</div>
                ) : suivisFiltres.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Aucun suivi</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={thStyle}>Apprenant</th>
                                    <th style={thStyle}>Sortie</th>
                                    <th style={thStyle}>Satisfaction</th>
                                    <th style={thStyle}>Suivi 3 mois</th>
                                    <th style={thStyle}>Suivi 6 mois</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suivisFiltres.map(s => (
                                    <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                                                {s.apprenant?.prenom} {s.apprenant?.nom}
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>{formatDate(s.date_sortie)}</span>
                                        </td>
                                        {renderCelluleSuivi(s, s.satisfaction_statut, s.date_sortie, s.quest_sat, 'satisfaction', 'satisfaction')}
                                        {renderCelluleSuivi(s, s.suivi_3mois_statut, s.suivi_3mois_date, s.quest_3mois, '3mois', 'suivi_3mois')}
                                        {renderCelluleSuivi(s, s.suivi_6mois_statut, s.suivi_6mois_date, s.quest_6mois, '6mois', 'suivi_6mois')}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Notes d'appel */}
            {modalNotes && (
                <div style={overlayStyle}>
                    <div style={modalStyle}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#1e293b' }}>
                            Resultat de l'appel
                        </h3>
                        <textarea
                            value={modalNotes.notes}
                            onChange={(e) => setModalNotes({ ...modalNotes, notes: e.target.value })}
                            placeholder="Notes sur l'appel (facultatif)..."
                            style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalNotes(null)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer' }}>
                                Annuler
                            </button>
                            <button onClick={sauvegarderAppel} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '600' }}>
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reponses */}
            {modalReponses && (
                <div style={overlayStyle}>
                    <div style={{ ...modalStyle, maxWidth: '500px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#1e293b' }}>Reponses</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Object.entries(modalReponses).map(([qId, val]) => (
                                <div key={qId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '14px', color: '#64748b' }}>Question {qId}</span>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                        {typeof val === 'string' && val.startsWith('data:audio')
                                            ? <audio controls src={val} style={{ height: '32px' }} />
                                            : labelReponse(val)
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setModalReponses(null)} style={{ marginTop: '16px', padding: '8px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}>
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }
const tdStyle = { padding: '12px 16px', fontSize: '14px', verticalAlign: 'top' }
const btnSmall = (color, enabled) => ({
    padding: '4px 8px', fontSize: '10px', fontWeight: '700', border: 'none', borderRadius: '6px',
    backgroundColor: enabled ? color : '#cbd5e1', color: 'white',
    cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.6
})
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalStyle = { backgroundColor: 'white', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }

export default withAuthAdmin(SuiviPostFormation, "Suivi Post-Formation")
