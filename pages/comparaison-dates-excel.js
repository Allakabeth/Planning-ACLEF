import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import * as XLSX from 'xlsx'

const FILE_MAPPING = {
  'HSP CCP': 'Centre Camille Pagé',
  'HSP MPT': 'Maison Pour Tous',
  'HSP Lencloître': 'Lencloître',
  'HSP Pleumartin': 'Pleumartin'
}

export default function ComparaisonDatesExcel() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fichiers, setFichiers] = useState([])
  const [resultats, setResultats] = useState(null)
  const [comparaison, setComparaison] = useState(false)
  const [envoyerMessageState, setEnvoyerMessageState] = useState(false)
  const [messageEnvoye, setMessageEnvoye] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      if (!supabaseUser) {
        router.push('/login')
        return
      }
      setUser(supabaseUser)
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const excelDateToJS = (excelDate) => {
    if (!excelDate || typeof excelDate !== 'number') return null
    return new Date((excelDate - 25569) * 86400 * 1000)
  }

  const formatDate = (date) => {
    if (!date) return null
    const d = new Date(date)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }

  const formatDateFr = (dateStr) => {
    if (!dateStr) return 'Non définie'
    const [year, month, day] = dateStr.split('-')
    return day + '/' + month + '/' + year
  }

  const normaliserNom = (nom) => {
    if (!nom) return ''
    return nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s-]/g, '').replace(/\s+/g, ' ').trim()
  }

  const detecterLieu = (fileName) => {
    for (const [pattern, lieu] of Object.entries(FILE_MAPPING)) {
      if (fileName.toLowerCase().includes(pattern.toLowerCase())) {
        return lieu
      }
    }
    return null
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
    setFichiers(prev => [...prev, ...files])
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
    setFichiers(prev => [...prev, ...files])
  }

  const supprimerFichier = (index) => {
    setFichiers(prev => prev.filter((_, i) => i !== index))
  }

  const lireExcel = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('info')) || workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })
          const lieu = detecterLieu(file.name)
          const apprenants = []
          for (let i = 2; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (!row || !row[0]) continue
            const nomComplet = String(row[0]).trim()
            if (!nomComplet || nomComplet.toLowerCase().includes('total')) continue
            apprenants.push({
              nomComplet,
              nomNormalise: normaliserNom(nomComplet),
              dateDebut: formatDate(excelDateToJS(row[11])),
              dateFin: formatDate(excelDateToJS(row[12])),
              lieuFormation: lieu,
              fichier: file.name
            })
          }
          resolve({ fichier: file.name, lieu, apprenants })
        } catch (err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const lancerComparaison = async () => {
    if (fichiers.length === 0) { alert('Veuillez ajouter au moins un fichier Excel'); return }
    setComparaison(true)
    setResultats(null)
    setMessageEnvoye(false)
    try {
      const excelResults = await Promise.all(fichiers.map(f => lireExcel(f)))
      const tousApprenants = excelResults.flatMap(r => r.apprenants)
      const { data: supabaseData, error } = await supabase.from('apprenants_actifs').select('id, prenom, nom, date_entree_formation, date_sortie_previsionnelle, lieu_formation')
      if (error) throw error
      const supabaseApprenants = supabaseData.map(a => ({
        id: a.id,
        nomComplet: a.nom + ' ' + a.prenom,
        nomNormalise: normaliserNom(a.nom + ' ' + a.prenom),
        dateDebut: a.date_entree_formation,
        dateFin: a.date_sortie_previsionnelle,
        lieuFormation: a.lieu_formation
      }))
      const differences = []
      const nonTrouves = []
      for (const excel of tousApprenants) {
        const candidats = supabaseApprenants.filter(s => s.lieuFormation === excel.lieuFormation)
        let match = candidats.find(s => s.nomNormalise === excel.nomNormalise)
        if (!match) {
          const nomFamille = excel.nomNormalise.split(' ')[0]
          match = candidats.find(s => s.nomNormalise.startsWith(nomFamille))
        }
        if (!match) { nonTrouves.push(excel); continue }
        const diffDebut = excel.dateDebut !== match.dateDebut
        const diffFin = excel.dateFin !== match.dateFin
        if (diffDebut || diffFin) {
          differences.push({ nom: excel.nomComplet, lieu: excel.lieuFormation, fichier: excel.fichier, excel: { dateDebut: excel.dateDebut, dateFin: excel.dateFin }, supabase: { dateDebut: match.dateDebut, dateFin: match.dateFin }, diffDebut, diffFin })
        }
      }
      setResultats({ totalExcel: tousApprenants.length, totalSupabase: supabaseApprenants.length, differences, nonTrouves, fichiers: excelResults.map(r => ({ nom: r.fichier, lieu: r.lieu, count: r.apprenants.length })) })
    } catch (err) { alert('Erreur: ' + err.message) }
    finally { setComparaison(false) }
  }

  const envoyerRapport = async () => {
    if (!resultats) return
    setEnvoyerMessageState(true)
    try {
      const now = new Date()
      const date = formatDate(now)
      const heure = now.toTimeString().slice(0, 5)
      let contenu = 'Comparaison Excel vs Base de données\nExécuté le ' + formatDateFr(date) + ' à ' + heure + '\n\n'
      if (resultats.differences.length === 0 && resultats.nonTrouves.length === 0) {
        contenu += 'Aucune différence détectée !'
      } else {
        if (resultats.differences.length > 0) {
          contenu += resultats.differences.length + ' différence(s) trouvée(s) :\n\n'
          for (const d of resultats.differences) {
            contenu += '- ' + d.nom + ' (' + d.lieu + ')\n'
            if (d.diffDebut) contenu += '  Début: Excel ' + formatDateFr(d.excel.dateDebut) + ' / Base ' + formatDateFr(d.supabase.dateDebut) + '\n'
            if (d.diffFin) contenu += '  Fin: Excel ' + formatDateFr(d.excel.dateFin) + ' / Base ' + formatDateFr(d.supabase.dateFin) + '\n'
          }
        }
        if (resultats.nonTrouves.length > 0) contenu += '\n' + resultats.nonTrouves.length + ' non trouvé(s) dans la base\n'
      }
      const { error } = await supabase.from('messages').insert({ expediteur_id: null, destinataire_id: null, expediteur: 'Comparaison Excel', destinataire: 'Coordination ACLEF', objet: resultats.differences.length > 0 ? 'Alerte - ' + resultats.differences.length + ' différence(s) de dates' : 'Sync Excel - OK', contenu, type: 'sync_excel', lu: false, archive: false, statut_validation: 'nouveau', date, heure })
      if (error) throw error
      setMessageEnvoye(true)
      alert('Rapport envoyé dans la messagerie !')
    } catch (err) { alert('Erreur: ' + err.message) }
    finally { setEnvoyerMessageState(false) }
  }

  if (loading) {
    return (<div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'white', fontSize: '18px' }}>Chargement...</div></div>)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      <div style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '15px 20px', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed', margin: 0 }}>Comparaison Dates Excel / Base de données</h1>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Retour Accueil</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', color: '#374151', marginBottom: '15px' }}>1. Charger les fichiers Excel</h2>
          <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => document.getElementById('fileInput').click()} style={{ border: '2px dashed #7c3aed', borderRadius: '12px', padding: '40px', textAlign: 'center', backgroundColor: '#f5f3ff', marginBottom: '15px', cursor: 'pointer' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
            <p style={{ color: '#6b7280', margin: 0 }}>Glissez-déposez vos fichiers Excel ici<br/>ou cliquez pour sélectionner</p>
            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '10px' }}>Fichiers attendus: HSP CCP, HSP MPT, HSP Lencloître, HSP Pleumartin</p>
            <input id="fileInput" type="file" multiple accept=".xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
          </div>
          {fichiers.length > 0 && (<div style={{ marginBottom: '15px' }}><h3 style={{ fontSize: '14px', color: '#374151', marginBottom: '10px' }}>Fichiers ({fichiers.length})</h3>{fichiers.map((f, idx) => (<div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e5e7eb' }}><div><span style={{ fontWeight: '500' }}>{f.name}</span><span style={{ marginLeft: '10px', padding: '2px 8px', backgroundColor: detecterLieu(f.name) ? '#d1fae5' : '#fee2e2', color: detecterLieu(f.name) ? '#065f46' : '#991b1b', borderRadius: '4px', fontSize: '12px' }}>{detecterLieu(f.name) || 'Lieu ?'}</span></div><button onClick={() => supprimerFichier(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '18px' }}>×</button></div>))}</div>)}
          <button onClick={lancerComparaison} disabled={fichiers.length === 0 || comparaison} style={{ width: '100%', padding: '15px', background: fichiers.length === 0 || comparaison ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: fichiers.length === 0 || comparaison ? 'not-allowed' : 'pointer' }}>{comparaison ? 'Comparaison en cours...' : 'Lancer la comparaison'}</button>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', color: '#374151', marginBottom: '15px' }}>2. Résultats</h2>
          {!resultats ? (<div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: '8px' }}><div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div><p>Chargez des fichiers et lancez la comparaison</p></div>) : (<>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '15px', backgroundColor: '#dbeafe', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>{resultats.totalExcel}</div><div style={{ fontSize: '12px', color: '#3b82f6' }}>Excel</div></div>
              <div style={{ padding: '15px', backgroundColor: resultats.differences.length > 0 ? '#fee2e2' : '#d1fae5', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: resultats.differences.length > 0 ? '#dc2626' : '#059669' }}>{resultats.differences.length}</div><div style={{ fontSize: '12px', color: resultats.differences.length > 0 ? '#ef4444' : '#10b981' }}>Différences</div></div>
              <div style={{ padding: '15px', backgroundColor: resultats.nonTrouves.length > 0 ? '#fef3c7' : '#d1fae5', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: resultats.nonTrouves.length > 0 ? '#d97706' : '#059669' }}>{resultats.nonTrouves.length}</div><div style={{ fontSize: '12px', color: resultats.nonTrouves.length > 0 ? '#f59e0b' : '#10b981' }}>Non trouvés</div></div>
            </div>
            {resultats.differences.length > 0 && (<div style={{ marginBottom: '20px' }}><h3 style={{ fontSize: '14px', color: '#dc2626', marginBottom: '10px' }}>Différences ({resultats.differences.length})</h3><div style={{ maxHeight: '250px', overflow: 'auto' }}>{resultats.differences.map((d, idx) => (<div key={idx} style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '8px', border: '1px solid #fecaca' }}><div style={{ fontWeight: '600', marginBottom: '5px' }}>{d.nom} <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#e0e7ff', borderRadius: '4px', fontSize: '11px', color: '#3730a3' }}>{d.lieu}</span></div>{d.diffDebut && <div style={{ fontSize: '13px', color: '#6b7280' }}>Début: Excel {formatDateFr(d.excel.dateDebut)} → Base {formatDateFr(d.supabase.dateDebut)}</div>}{d.diffFin && <div style={{ fontSize: '13px', color: '#6b7280' }}>Fin: Excel {formatDateFr(d.excel.dateFin)} → Base {formatDateFr(d.supabase.dateFin)}</div>}</div>))}</div></div>)}
            {resultats.differences.length === 0 && resultats.nonTrouves.length === 0 && (<div style={{ padding: '20px', backgroundColor: '#d1fae5', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}><div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div><p style={{ color: '#065f46', fontWeight: '600', margin: 0 }}>Toutes les dates correspondent !</p></div>)}
            <button onClick={envoyerRapport} disabled={envoyerMessageState || messageEnvoye} style={{ width: '100%', padding: '15px', background: messageEnvoye ? '#059669' : envoyerMessageState ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: envoyerMessageState || messageEnvoye ? 'not-allowed' : 'pointer' }}>{messageEnvoye ? '✅ Rapport envoyé !' : envoyerMessageState ? 'Envoi...' : 'Envoyer le rapport dans la messagerie'}</button>
          </>)}
        </div>
      </div>
    </div>
  )
}
