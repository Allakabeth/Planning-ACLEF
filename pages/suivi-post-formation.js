import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

// Questions pour le formulaire d'appel
const QUESTIONS = {
    satisfaction: [
        { id: 1, text: "La formation vous a plu ?", type: 'choix3' },
        { id: 2, text: "La formation etait comme vous voulez ?", type: 'choix3' },
        { id: 3, text: "Vous avez appris de nouvelles choses ?", type: 'choix3' },
        { id: 4, text: "Content de la duree de la formation ?", type: 'choix3' },
        { id: 5, text: "Les formateurs se sont adaptes a vos besoins ?", type: 'choix3' },
        { id: 6, text: "Les formateurs ont bien explique ?", type: 'choix3' },
        { id: 7, text: "Les salles et le materiel etaient bien ?", type: 'choix3' },
        { id: 8, text: "La formation vous aide pour vos projets ?", type: 'choix3' },
        { id: 9, text: "Aujourd'hui, vous etes :", type: 'situation' },
        { id: 10, text: "Quelque chose a nous dire ?", type: 'libre' }
    ],
    suivi_3mois: [
        { id: 1, text: "Aujourd'hui, vous etes :", type: 'situation' },
        { id: 2, text: "Quelle formation / quel travail ?", type: 'libre' },
        { id: 3, text: "La formation ACLEF vous a aide ?", type: 'choix3' },
        { id: 4, text: "Vous avez un projet ?", type: 'choix3' },
        { id: 5, text: "Quelque chose a nous dire ?", type: 'libre' }
    ],
    suivi_6mois: [
        { id: 1, text: "Aujourd'hui, vous etes :", type: 'situation' },
        { id: 2, text: "Quelle formation / quel travail ?", type: 'libre' },
        { id: 3, text: "La formation ACLEF vous a aide ?", type: 'choix3' },
        { id: 4, text: "Vous avez un projet ?", type: 'choix3' },
        { id: 5, text: "Quelque chose a nous dire ?", type: 'libre' }
    ]
}

// Questions pour l'analyse (gere le mapping SMS vs appel)
const QUESTIONS_ANALYSE = {
    satisfaction: [
        { id: 1, text: "La formation vous a plu ?", type: 'choix3' },
        { id: 2, text: "La formation etait comme vous voulez ?", type: 'choix3' },
        { id: 3, text: "Vous avez appris de nouvelles choses ?", type: 'choix3' },
        { id: 4, text: "Content de la duree ?", type: 'choix3' },
        { id: 5, text: "Formateurs adaptes a vos besoins ?", type: 'choix3' },
        { id: 6, text: "Formateurs ont bien explique ?", type: 'choix3' },
        { id: 7, text: "Salles et materiel ?", type: 'choix3' },
        { id: 8, text: "Formation aide pour vos projets ?", type: 'choix3' },
        { id: 9, text: "Situation actuelle", type: 'situation' }
    ],
    suivi_3mois: [
        { id: 1, text: "Situation actuelle", type: 'situation' },
        { id: 'aide', text: "La formation ACLEF vous a aide ?", type: 'choix3', smsId: 4, appelId: 3 },
        { id: 'projet', text: "Vous avez un projet ?", type: 'choix3', smsId: 5, appelId: 4 }
    ],
    suivi_6mois: [
        { id: 1, text: "Situation actuelle", type: 'situation' },
        { id: 'aide', text: "La formation ACLEF vous a aide ?", type: 'choix3', smsId: 4, appelId: 3 },
        { id: 'projet', text: "Vous avez un projet ?", type: 'choix3', smsId: 5, appelId: 4 }
    ]
}

function SuiviPostFormation({ user, logout, inactivityTime, priority }) {
    const router = useRouter()
    const canEdit = priority === 1

    // Vue active : 'suivi' ou 'resultats'
    const [vue, setVue] = useState('suivi')

    // --- ETAT SUIVI ---
    const [suivis, setSuivis] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [filtre, setFiltre] = useState('tous')
    const [modalAppel, setModalAppel] = useState(null)
    const [modalReponses, setModalReponses] = useState(null)

    // --- ETAT RESULTATS ---
    const [dateDebut, setDateDebut] = useState('')
    const [dateFin, setDateFin] = useState('')
    const [ongletResultat, setOngletResultat] = useState('satisfaction')
    const [resultats, setResultats] = useState(null)
    const [loadingResultats, setLoadingResultats] = useState(false)

    useEffect(() => { fetchSuivis() }, [])

    // ========== FONCTIONS SUIVI ==========

    const fetchSuivis = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('suivi_post_formation')
            .select('*, apprenant:apprenant_id (id, prenom, nom), quest_sat:satisfaction_questionnaire_id (id, short_code, statut, reponses), quest_3mois:suivi_3mois_questionnaire_id (id, short_code, statut, reponses), quest_6mois:suivi_6mois_questionnaire_id (id, short_code, statut, reponses)')
            .order('created_at', { ascending: false })
        if (!error && data) setSuivis(data)
        setIsLoading(false)
    }

    const sauvegarderAppel = async () => {
        if (!modalAppel) return
        const updates = { updated_at: new Date().toISOString() }
        const prefix = modalAppel.champ === 'satisfaction' ? 'satisfaction' : modalAppel.champ === '3mois' ? 'suivi_3mois' : 'suivi_6mois'
        updates[prefix + '_statut'] = 'appel_effectue'
        updates[prefix + '_notes'] = modalAppel.notes
        updates[prefix + '_appele_par'] = modalAppel.appelePar
        updates[prefix + '_date_appel'] = modalAppel.dateAppel
        await supabase.from('suivi_post_formation').update(updates).eq('id', modalAppel.suiviId)
        if (modalAppel.questionnaireId && modalAppel.reponses) {
            await supabase.from('questionnaires').update({ reponses: modalAppel.reponses, statut: 'complete', date_reponse: new Date().toISOString() }).eq('id', modalAppel.questionnaireId)
        }
        setModalAppel(null)
        setMessage('Appel enregistre')
        setTimeout(() => setMessage(''), 3000)
        await fetchSuivis()
    }

    const marquerInjoignable = async (suiviId, champ) => {
        const prefix = champ === 'satisfaction' ? 'satisfaction' : champ === '3mois' ? 'suivi_3mois' : 'suivi_6mois'
        await supabase.from('suivi_post_formation').update({ [prefix + '_statut']: 'injoignable', updated_at: new Date().toISOString() }).eq('id', suiviId)
        setMessage('Marque injoignable')
        setTimeout(() => setMessage(''), 3000)
        await fetchSuivis()
    }

    const toggleTelephoneHS = async (suiviId, currentValue) => {
        await supabase.from('suivi_post_formation').update({ telephone_hs: !currentValue, updated_at: new Date().toISOString() }).eq('id', suiviId)
        setMessage(!currentValue ? 'Telephone marque hors service' : 'Telephone marque fonctionnel')
        setTimeout(() => setMessage(''), 3000)
        await fetchSuivis()
    }

    const getStatutBadge = (statut) => {
        const styles = {
            'a_envoyer': { bg: '#fef3c7', color: '#92400e', label: 'SMS en attente' },
            'envoye': { bg: '#dbeafe', color: '#1e40af', label: 'SMS envoye' },
            'relance_1': { bg: '#ffedd5', color: '#c2410c', label: 'Relance envoyee' },
            'relance': { bg: '#ffedd5', color: '#c2410c', label: 'Relance envoyee' },
            'appeler': { bg: '#fee2e2', color: '#991b1b', label: 'A APPELER' },
            'appel_effectue': { bg: '#d1fae5', color: '#065f46', label: 'Appel fait' },
            'repondu': { bg: '#d1fae5', color: '#065f46', label: 'Repondu par SMS' },
            'injoignable': { bg: '#f3e8ff', color: '#6b21a8', label: 'Injoignable' },
            'a_venir': { bg: '#f1f5f9', color: '#475569', label: 'A venir' }
        }
        return styles[statut] || { bg: '#f1f5f9', color: '#475569', label: statut }
    }

    const estTermine = (s) => ['repondu', 'appel_effectue', 'injoignable'].includes(s.satisfaction_statut) && ['repondu', 'appel_effectue', 'injoignable'].includes(s.suivi_3mois_statut) && ['repondu', 'appel_effectue', 'injoignable'].includes(s.suivi_6mois_statut)
    const aAction = (s) => ['a_envoyer', 'relance_1', 'relance', 'appeler'].includes(s.satisfaction_statut) || ['a_envoyer', 'relance_1', 'relance', 'appeler'].includes(s.suivi_3mois_statut) || ['a_envoyer', 'relance_1', 'relance', 'appeler'].includes(s.suivi_6mois_statut)

    const suivisFiltres = suivis.filter(s => {
        if (filtre === 'tous') return true
        if (filtre === 'action') return aAction(s)
        if (filtre === 'termines') return estTermine(s)
        if (filtre === 'en_attente') return !estTermine(s) && !aAction(s)
        return true
    })

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'
    const formatDateInput = () => new Date().toISOString().split('T')[0]
    const labelReponse = (val) => ({ 'oui': 'OUI', 'un_peu': 'UN PEU', 'non': 'NON', 'formation': 'En formation', 'emploi': 'En emploi', 'recherche': 'En recherche', 'autre': 'Autre' }[val] || val)

    // ========== FONCTIONS RESULTATS ==========

    const fetchResultats = async () => {
        setLoadingResultats(true)
        let query = supabase.from('suivi_post_formation').select('*')
        if (dateDebut) query = query.gte('date_sortie', dateDebut)
        if (dateFin) query = query.lte('date_sortie', dateFin)
        const { data: suivisR } = await query
        if (!suivisR) { setLoadingResultats(false); return }

        const qField = ongletResultat === 'satisfaction' ? 'satisfaction_questionnaire_id' : ongletResultat === 'suivi_3mois' ? 'suivi_3mois_questionnaire_id' : 'suivi_6mois_questionnaire_id'
        const statutField = ongletResultat === 'satisfaction' ? 'satisfaction_statut' : ongletResultat === 'suivi_3mois' ? 'suivi_3mois_statut' : 'suivi_6mois_statut'
        const questIds = suivisR.map(s => s[qField]).filter(Boolean)

        let questionnaires = []
        if (questIds.length > 0) {
            const { data } = await supabase.from('questionnaires').select('id, reponses, statut').in('id', questIds).eq('statut', 'complete')
            questionnaires = data || []
        }

        const totalSuivis = suivisR.length
        const totalRepondus = suivisR.filter(s => ['repondu', 'appel_effectue'].includes(s[statutField])).length
        const questions = QUESTIONS_ANALYSE[ongletResultat] || []
        const distributions = {}

        for (const q of questions) {
            if (q.type === 'choix3') distributions[q.id] = { oui: 0, un_peu: 0, non: 0, total: 0 }
            else if (q.type === 'situation') distributions[q.id] = { formation: 0, emploi: 0, recherche: 0, autre: 0, total: 0 }
        }

        for (const quest of questionnaires) {
            if (!quest.reponses) continue
            const suivi = suivisR.find(s => s[qField] === quest.id)
            const estAppel = suivi && suivi[statutField] === 'appel_effectue'

            for (const q of questions) {
                let rid = q.id
                if (q.smsId && q.appelId) rid = estAppel ? q.appelId : q.smsId
                const val = quest.reponses[rid]
                if (!val || !distributions[q.id]) continue
                if (q.type === 'choix3' && ['oui', 'un_peu', 'non'].includes(val)) { distributions[q.id][val]++; distributions[q.id].total++ }
                if (q.type === 'situation' && ['formation', 'emploi', 'recherche', 'autre'].includes(val)) { distributions[q.id][val]++; distributions[q.id].total++ }
            }
        }

        setResultats({ totalSuivis, totalRepondus, distributions })
        setLoadingResultats(false)
    }

    const pct = (n, t) => t > 0 ? (n / t * 100).toFixed(1) : '0.0'

    // Export PDF via impression navigateur
    const exporterPDF = () => {
        window.print()
    }

    // ========== RENDU CELLULE SUIVI ==========

    const renderCelluleSuivi = (s, statut, date, questionnaire, champ, dateEnvoi, notes, appelePar, dateAppel) => {
        const badge = getStatutBadge(statut)
        return (
            <td style={tdStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {date && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDate(date)}</span>}
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: badge.bg, color: badge.color, textAlign: 'center' }}>{badge.label}</span>
                    {dateEnvoi && ['envoye', 'relance_1', 'relance', 'appeler'].includes(statut) && (
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Envoye le {formatDate(dateEnvoi)}</span>
                    )}
                    {statut === 'appel_effectue' && (
                        <div style={{ fontSize: '10px', color: '#065f46', backgroundColor: '#ecfdf5', padding: '4px 6px', borderRadius: '6px' }}>
                            {dateAppel && <div>Appel le {formatDate(dateAppel)}</div>}
                            {appelePar && <div>Par {appelePar}</div>}
                            {notes && <div style={{ marginTop: '2px', fontStyle: 'italic' }}>{notes.substring(0, 60)}{notes.length > 60 ? '...' : ''}</div>}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {['appeler', 'envoye', 'relance_1', 'relance', 'a_envoyer'].includes(statut) && (
                            <button onClick={() => {
                                const typeQ = champ === 'satisfaction' ? 'satisfaction' : champ === '3mois' ? 'suivi_3mois' : 'suivi_6mois'
                                const qs = QUESTIONS[typeQ] || []
                                const rep = {}; qs.forEach(q => { rep[q.id] = '' })
                                setModalAppel({ suiviId: s.id, champ, type: typeQ, questionnaireId: questionnaire?.id || null, appelePar: user?.email || '', dateAppel: formatDateInput(), notes: '', reponses: rep })
                            }} disabled={!canEdit} style={btnSmall(statut === 'appeler' ? '#ef4444' : '#f59e0b', canEdit)}>
                                {statut === 'appeler' ? 'APPELER' : 'Saisir appel'}
                            </button>
                        )}
                        {statut === 'appeler' && <button onClick={() => marquerInjoignable(s.id, champ)} disabled={!canEdit} style={btnSmall('#8b5cf6', canEdit)}>Injoignable</button>}
                        {questionnaire?.statut === 'complete' && <button onClick={() => setModalReponses(questionnaire.reponses)} style={btnSmall('#3b82f6', true)}>Voir reponses</button>}
                        {statut === 'appel_effectue' && notes && notes.length > 60 && <button onClick={() => setModalReponses({ 'Notes': notes })} style={btnSmall('#64748b', true)}>Voir tout</button>}
                    </div>
                </div>
            </td>
        )
    }

    // ========== RENDU BARRE RESULTAT ==========

    const BarreResultat = ({ label, count, total, color }) => {
        const p = total > 0 ? (count / total * 100) : 0
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ width: '100px', fontSize: '13px', color: '#475569', textAlign: 'right' }}>{label}</span>
                <div style={{ flex: 1, height: '24px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: p + '%', height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 0.5s' }} />
                </div>
                <span style={{ width: '90px', fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{count} ({p.toFixed(1)}%)</span>
            </div>
        )
    }

    // ========== RENDU PRINCIPAL ==========

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px' }}>Suivi Post-Formation</h1>
                        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Satisfaction + Rappels 3 et 6 mois</p>
                    </div>
                    <button onClick={() => router.push('/')} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>Retour</button>
                </div>

                {/* Message */}
                {message && <div style={{ padding: '12px 16px', backgroundColor: '#d1fae5', borderRadius: '8px', marginBottom: '16px', color: '#065f46', fontWeight: '600', fontSize: '14px' }}>{message}</div>}

                {/* Onglets principaux : Suivi / Resultats */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                    {[{ val: 'suivi', label: 'Suivi des apprenants' }, { val: 'resultats', label: 'Resultats & Analyse' }].map(v => (
                        <button key={v.val} onClick={() => setVue(v.val)} style={{
                            padding: '12px 24px', border: 'none', borderRadius: '8px 8px 0 0', fontSize: '15px', cursor: 'pointer', fontWeight: vue === v.val ? '700' : '500',
                            backgroundColor: vue === v.val ? 'white' : '#e2e8f0', color: vue === v.val ? '#1e40af' : '#64748b',
                            boxShadow: vue === v.val ? '0 -2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}>{v.label}</button>
                    ))}
                </div>

                {/* ==================== VUE SUIVI ==================== */}
                {vue === 'suivi' && (
                    <>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            {[
                                { val: 'tous', label: 'Tous', count: suivis.length },
                                { val: 'action', label: 'Action requise', count: suivis.filter(aAction).length },
                                { val: 'en_attente', label: 'En attente', count: suivis.filter(s => !estTermine(s) && !aAction(s)).length },
                                { val: 'termines', label: 'Termines', count: suivis.filter(estTermine).length }
                            ].map(f => (
                                <button key={f.val} onClick={() => setFiltre(f.val)} style={{
                                    padding: '8px 16px', borderRadius: '20px',
                                    border: filtre === f.val ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                                    backgroundColor: filtre === f.val ? '#dbeafe' : 'white',
                                    color: filtre === f.val ? '#1e40af' : '#64748b',
                                    cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                                }}>{f.label} ({f.count})</button>
                            ))}
                        </div>

                        {isLoading ? <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Chargement...</div>
                        : suivisFiltres.length === 0 ? <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Aucun suivi</div>
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <thead><tr style={{ backgroundColor: '#f8fafc' }}>
                                        <th style={thStyle}>Apprenant</th><th style={thStyle}>Sortie</th><th style={thStyle}>Satisfaction</th><th style={thStyle}>Suivi 3 mois</th><th style={thStyle}>Suivi 6 mois</th>
                                    </tr></thead>
                                    <tbody>
                                        {suivisFiltres.map(s => (
                                            <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {s.apprenant?.prenom} {s.apprenant?.nom}
                                                        {s.telephone_hs && <span style={{ fontSize: '12px', color: '#ef4444' }}>Tel HS</span>}
                                                    </div>
                                                    <button onClick={() => toggleTelephoneHS(s.id, s.telephone_hs)} disabled={!canEdit} style={{
                                                        marginTop: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: '600',
                                                        border: '1px solid #e2e8f0', borderRadius: '4px', cursor: canEdit ? 'pointer' : 'not-allowed',
                                                        backgroundColor: s.telephone_hs ? '#fee2e2' : 'white', color: s.telephone_hs ? '#991b1b' : '#64748b'
                                                    }}>{s.telephone_hs ? 'Tel HS - reactiver' : 'Signaler tel HS'}</button>
                                                </td>
                                                <td style={tdStyle}><span style={{ fontSize: '13px', color: '#64748b' }}>{formatDate(s.date_sortie)}</span></td>
                                                {renderCelluleSuivi(s, s.satisfaction_statut, s.date_sortie, s.quest_sat, 'satisfaction', s.satisfaction_date_envoi, s.satisfaction_notes, s.satisfaction_appele_par, s.satisfaction_date_appel)}
                                                {renderCelluleSuivi(s, s.suivi_3mois_statut, s.suivi_3mois_date, s.quest_3mois, '3mois', null, s.suivi_3mois_notes, s.suivi_3mois_appele_par, s.suivi_3mois_date_appel)}
                                                {renderCelluleSuivi(s, s.suivi_6mois_statut, s.suivi_6mois_date, s.quest_6mois, '6mois', null, s.suivi_6mois_notes, s.suivi_6mois_appele_par, s.suivi_6mois_date_appel)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* ==================== VUE RESULTATS ==================== */}
                {vue === 'resultats' && (
                    <>
                        {/* Filtre dates */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', backgroundColor: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div>
                                <label style={labelStyle}>Date debut</label>
                                <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Date fin</label>
                                <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={inputStyle} />
                            </div>
                            <button onClick={fetchResultats} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Analyser</button>
                            {resultats && <button onClick={exporterPDF} style={{ padding: '10px 20px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Exporter PDF</button>}
                        </div>

                        {/* Sous-onglets */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                            {[{ val: 'satisfaction', label: 'Satisfaction' }, { val: 'suivi_3mois', label: 'Suivi 3 mois' }, { val: 'suivi_6mois', label: 'Suivi 6 mois' }].map(o => (
                                <button key={o.val} onClick={() => { setOngletResultat(o.val); setResultats(null) }} style={{
                                    padding: '8px 16px', borderRadius: '20px',
                                    border: ongletResultat === o.val ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                                    backgroundColor: ongletResultat === o.val ? '#dbeafe' : 'white',
                                    color: ongletResultat === o.val ? '#1e40af' : '#64748b',
                                    cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                                }}>{o.label}</button>
                            ))}
                        </div>

                        {/* Contenu resultats */}
                        {loadingResultats ? <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Chargement...</div>
                        : !resultats ? <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: 'white', borderRadius: '12px' }}>Selectionnez une periode et cliquez Analyser</div>
                        : (
                            <div id="resultats-print" style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                {/* Cartes stats */}
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                                    <div style={{ flex: 1, padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{resultats.totalSuivis}</div>
                                        <div style={{ fontSize: '13px', color: '#64748b' }}>Total apprenants</div>
                                    </div>
                                    <div style={{ flex: 1, padding: '20px', backgroundColor: '#d1fae5', borderRadius: '12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#065f46' }}>{resultats.totalRepondus}</div>
                                        <div style={{ fontSize: '13px', color: '#065f46' }}>Ont repondu</div>
                                    </div>
                                    <div style={{ flex: 1, padding: '20px', backgroundColor: '#dbeafe', borderRadius: '12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e40af' }}>{pct(resultats.totalRepondus, resultats.totalSuivis)}%</div>
                                        <div style={{ fontSize: '13px', color: '#1e40af' }}>Taux de reponse</div>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>Resultats par question</h3>
                                {(QUESTIONS_ANALYSE[ongletResultat] || []).map(q => {
                                    const dist = resultats.distributions[q.id]
                                    if (!dist) return null
                                    return (
                                        <div key={q.id} style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>{q.text}</div>
                                            {q.type === 'choix3' && <>
                                                <BarreResultat label="OUI" count={dist.oui} total={dist.total} color="#10b981" />
                                                <BarreResultat label="UN PEU" count={dist.un_peu} total={dist.total} color="#f59e0b" />
                                                <BarreResultat label="NON" count={dist.non} total={dist.total} color="#ef4444" />
                                            </>}
                                            {q.type === 'situation' && <>
                                                <BarreResultat label="Formation" count={dist.formation} total={dist.total} color="#3b82f6" />
                                                <BarreResultat label="Emploi" count={dist.emploi} total={dist.total} color="#10b981" />
                                                <BarreResultat label="Recherche" count={dist.recherche} total={dist.total} color="#f59e0b" />
                                                <BarreResultat label="Autre" count={dist.autre} total={dist.total} color="#8b5cf6" />
                                            </>}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ==================== MODALS ==================== */}

            {/* Modal Saisie appel */}
            {modalAppel && (
                <div style={overlayStyle}>
                    <div style={{ ...modalStyle, maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '18px', color: '#1e293b' }}>Saisie d'appel telephonique</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}><label style={labelStyle}>Date</label><input type="date" value={modalAppel.dateAppel} onChange={(e) => setModalAppel({ ...modalAppel, dateAppel: e.target.value })} style={inputStyle} /></div>
                                <div style={{ flex: 1 }}><label style={labelStyle}>Appele par</label><input type="text" value={modalAppel.appelePar} onChange={(e) => setModalAppel({ ...modalAppel, appelePar: e.target.value })} placeholder="Prenom" style={inputStyle} /></div>
                            </div>
                            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                                <label style={{ ...labelStyle, fontSize: '15px', marginBottom: '12px' }}>Reponses de l'apprenant</label>
                                {(QUESTIONS[modalAppel.type] || []).map(q => (
                                    <div key={q.id} style={{ marginBottom: '14px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>{q.id}. {q.text}</div>
                                        {q.type === 'choix3' && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {[{ val: 'oui', label: 'OUI', bg: '#d1fae5', color: '#065f46' }, { val: 'un_peu', label: 'UN PEU', bg: '#fef3c7', color: '#92400e' }, { val: 'non', label: 'NON', bg: '#fee2e2', color: '#991b1b' }].map(opt => (
                                                    <button key={opt.val} onClick={() => setModalAppel({ ...modalAppel, reponses: { ...modalAppel.reponses, [q.id]: opt.val } })} style={{
                                                        flex: 1, padding: '8px', border: modalAppel.reponses[q.id] === opt.val ? '2px solid ' + opt.color : '2px solid #e2e8f0',
                                                        borderRadius: '8px', backgroundColor: modalAppel.reponses[q.id] === opt.val ? opt.bg : 'white', color: opt.color, fontWeight: '700', fontSize: '13px', cursor: 'pointer'
                                                    }}>{opt.label}</button>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === 'situation' && (
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {[{ val: 'formation', label: 'En formation' }, { val: 'emploi', label: 'En emploi' }, { val: 'recherche', label: 'En recherche' }, { val: 'autre', label: 'Autre' }].map(opt => (
                                                    <button key={opt.val} onClick={() => setModalAppel({ ...modalAppel, reponses: { ...modalAppel.reponses, [q.id]: opt.val } })} style={{
                                                        padding: '8px 12px', border: modalAppel.reponses[q.id] === opt.val ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                                                        borderRadius: '8px', backgroundColor: modalAppel.reponses[q.id] === opt.val ? '#dbeafe' : 'white', color: '#1e293b', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
                                                    }}>{opt.label}</button>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === 'libre' && <textarea value={modalAppel.reponses[q.id] || ''} onChange={(e) => setModalAppel({ ...modalAppel, reponses: { ...modalAppel.reponses, [q.id]: e.target.value } })} placeholder="Reponse..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />}
                                    </div>
                                ))}
                            </div>
                            <div><label style={labelStyle}>Commentaires</label><textarea value={modalAppel.notes} onChange={(e) => setModalAppel({ ...modalAppel, notes: e.target.value })} placeholder="Observations..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalAppel(null)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer' }}>Annuler</button>
                            <button onClick={sauvegarderAppel} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Enregistrer</button>
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
                                <div key={qId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', color: '#64748b' }}>Question {qId}</span>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                        {typeof val === 'string' && val.startsWith('data:audio') ? <audio controls src={val} style={{ height: '32px' }} /> : labelReponse(val)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setModalReponses(null)} style={{ marginTop: '16px', padding: '10px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}>Fermer</button>
                    </div>
                </div>
            )}

            {/* CSS impression PDF */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #resultats-print, #resultats-print * { visibility: visible; }
                    #resultats-print { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>
        </div>
    )
}

const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }
const tdStyle = { padding: '12px 16px', fontSize: '14px', verticalAlign: 'top' }
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }
const inputStyle = { padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }
const btnSmall = (color, enabled) => ({ padding: '4px 8px', fontSize: '10px', fontWeight: '700', border: 'none', borderRadius: '6px', backgroundColor: enabled ? color : '#cbd5e1', color: 'white', cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.6 })
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalStyle = { backgroundColor: 'white', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }

export default withAuthAdmin(SuiviPostFormation, "Suivi Post-Formation")
