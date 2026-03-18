import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

// Definitions des questions par type de questionnaire
const QUESTIONS = {
  satisfaction: [
    { id: 1, text: "La formation vous a plu ?", type: 'choix3', illustration: "📚", audio: "Êtes-vous satisfait ou satisfaite de la formation ?" },
    { id: 2, text: "La formation était comme vous voulez ?", type: 'choix3', illustration: "🎯", audio: "La formation, elle était comme vous voulez ?" },
    { id: 3, text: "Vous avez appris de nouvelles choses ?", type: 'choix3', illustration: "💡", audio: "Vous avez appris de nouvelles choses pendant la formation ?" },
    { id: 4, text: "Content de la durée de la formation ?", type: 'choix3', illustration: "⏰", audio: "Vous êtes content de la durée de la formation ?" },
    { id: 5, text: "Les formateurs se sont adaptés à vos besoins ?", type: 'choix3', illustration: "🤝", audio: "Les formateurs se sont adaptés à vos besoins ?" },
    { id: 6, text: "Les formateurs ont bien expliqué ?", type: 'choix3', illustration: "🗣️", audio: "Les formateurs ont bien expliqué ?" },
    { id: 7, text: "Les salles et le matériel étaient bien ?", type: 'choix3', illustration: "🏫", audio: "Les salles et le matériel, ordinateur, téléphone, étaient adaptés pour travailler ?" },
    { id: 8, text: "La formation vous aide pour vos projets ?", type: 'choix3', illustration: "🚀", audio: "Grâce à la formation, vous pouvez avancer dans vos projets ? Travail, formation, démarches ?" },
    { id: 9, text: "Aujourd'hui, vous êtes :", type: 'situation', illustration: "👤", audio: "Aujourd'hui, qu'est-ce que vous faites ?" },
    { id: 10, text: "Quelque chose à nous dire ?", type: 'vocal', illustration: "💬", audio: "Avez-vous quelque chose à nous dire pour améliorer la formation ? Appuyez sur le bouton rouge pour enregistrer votre message." }
  ],
  suivi_3mois: [
    { id: 1, text: "Aujourd'hui, vous êtes :", type: 'situation', illustration: "👤", audio: "Aujourd'hui, qu'est-ce que vous faites ?" },
    { id: 2, text: "Quelle formation ?", type: 'vocal', illustration: "🎓", condition: { questionId: 1, value: 'formation' }, audio: "Vous êtes en formation. Quelle formation ? Dites-le avec le bouton rouge." },
    { id: 3, text: "Vous faites quoi comme travail ?", type: 'vocal', illustration: "💼", condition: { questionId: 1, value: 'emploi' }, audio: "Vous travaillez. Vous faites quoi ? Dites-le avec le bouton rouge." },
    { id: 4, text: "La formation ACLEF vous a aidé ?", type: 'choix3', illustration: "💪", audio: "La formation à l'ACLEF vous a aidé ?" },
    { id: 5, text: "Vous avez un projet ?", type: 'choix3', illustration: "🌟", audio: "Vous avez un projet ?" },
    { id: 6, text: "Quelque chose à nous dire ?", type: 'vocal', illustration: "💬", audio: "Avez-vous quelque chose à nous dire ? Appuyez sur le bouton rouge pour enregistrer votre message." }
  ],
  suivi_6mois: [
    { id: 1, text: "Aujourd'hui, vous êtes :", type: 'situation', illustration: "👤", audio: "Aujourd'hui, qu'est-ce que vous faites ?" },
    { id: 2, text: "Quelle formation ?", type: 'vocal', illustration: "🎓", condition: { questionId: 1, value: 'formation' }, audio: "Vous êtes en formation. Quelle formation ? Dites-le avec le bouton rouge." },
    { id: 3, text: "Vous faites quoi comme travail ?", type: 'vocal', illustration: "💼", condition: { questionId: 1, value: 'emploi' }, audio: "Vous travaillez. Vous faites quoi ? Dites-le avec le bouton rouge." },
    { id: 4, text: "La formation ACLEF vous a aidé ?", type: 'choix3', audio: "La formation à l'ACLEF vous a aidé ?" },
    { id: 5, text: "Vous avez un projet ?", type: 'choix3', audio: "Vous avez un projet ?" },
    { id: 6, text: "Quelque chose à nous dire ?", type: 'vocal', audio: "Avez-vous quelque chose à nous dire ? Appuyez sur le bouton rouge pour enregistrer votre message." }
  ]
}

export default function QuestionnairePage() {
  const router = useRouter()
  const { token } = router.query

  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [dejaRepondu, setDejaRepondu] = useState(false)
  const [typeQuestionnaire, setTypeQuestionnaire] = useState(null)
  const [prenom, setPrenom] = useState('')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [reponses, setReponses] = useState({})
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [termine, setTermine] = useState(false)

  // Audio - lecture des questions
  const synthRef = useRef(null)

  // Audio - enregistrement vocal
  const [enregistrement, setEnregistrement] = useState(false)
  const [audioURL, setAudioURL] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  // Charger le questionnaire
  useEffect(() => {
    if (!token) return
    fetch(`/api/questionnaire/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setErreur(data.error)
        } else if (data.deja_repondu) {
          setDejaRepondu(true)
        } else {
          setTypeQuestionnaire(data.questionnaire.type)
          setPrenom(data.prenom)
        }
        setLoading(false)
      })
      .catch(() => {
        setErreur('Impossible de charger le questionnaire')
        setLoading(false)
      })
  }, [token])

  // Questions filtrees (en tenant compte des conditions)
  const questions = typeQuestionnaire ? QUESTIONS[typeQuestionnaire] || [] : []
  const questionsVisibles = questions.filter(q => {
    if (!q.condition) return true
    return reponses[q.condition.questionId] === q.condition.value
  })

  const questionActuelle = questionsVisibles[questionIndex]
  const totalQuestions = questionsVisibles.length
  const isLastQuestion = questionIndex === totalQuestions - 1

  // Lire la question a voix haute
  function lireQuestion() {
    if (!questionActuelle) return
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(questionActuelle.audio || questionActuelle.text)
      utterance.lang = 'fr-FR'
      utterance.rate = 0.8
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }

  // Enregistrement vocal
  async function demarrerEnregistrement() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioURL(url)
        // Sauvegarder le blob en base64 dans les reponses
        const reader = new FileReader()
        reader.onloadend = () => {
          setReponses(prev => ({ ...prev, [questionActuelle.id]: reader.result }))
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setEnregistrement(true)
      setAudioURL(null)
    } catch (err) {
      alert('Impossible d\'accéder au micro. Vérifiez les permissions.')
    }
  }

  function arreterEnregistrement() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setEnregistrement(false)
    }
  }

  // Lire la question automatiquement quand elle change
  useEffect(() => {
    if (!questionActuelle) return
    // Petit delai pour laisser l'ecran se mettre a jour
    const timer = setTimeout(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(questionActuelle.audio || questionActuelle.text)
        utterance.lang = 'fr-FR'
        utterance.rate = 0.8
        utterance.pitch = 1
        window.speechSynthesis.speak(utterance)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [questionIndex, questionActuelle])

  // Selectionner une reponse (choix3 ou situation) - pas d'auto-avance
  function selectionnerReponse(valeur) {
    setReponses(prev => ({ ...prev, [questionActuelle.id]: valeur }))
  }

  // Navigation
  function precedent() {
    if (questionIndex > 0) {
      setQuestionIndex(prev => prev - 1)
      setAudioURL(null)
    }
  }

  function suivant() {
    if (!isLastQuestion) {
      setQuestionIndex(prev => prev + 1)
      setAudioURL(null)
    }
  }

  // Envoyer les reponses
  async function envoyerReponses() {
    setEnvoiEnCours(true)
    try {
      const res = await fetch(`/api/questionnaire/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reponses })
      })
      if (res.ok) {
        setTermine(true)
      } else {
        alert('Erreur, veuillez réessayer')
      }
    } catch {
      alert('Erreur de connexion')
    }
    setEnvoiEnCours(false)
  }

  // --- RENDU ---

  // Styles communs
  const pageStyle = {
    minHeight: '100vh',
    backgroundColor: '#f0f4ff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '32px 24px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
    textAlign: 'center'
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '20px', color: '#6b7280' }}>Chargement...</p>
        </div>
      </div>
    )
  }

  if (erreur) {
    return (
      <div style={pageStyle}>
        <Head><title>ACLEF - Questionnaire</title></Head>
        <div style={cardStyle}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😔</div>
          <p style={{ fontSize: '20px', color: '#ef4444' }}>{erreur}</p>
        </div>
      </div>
    )
  }

  if (dejaRepondu) {
    return (
      <div style={pageStyle}>
        <Head><title>ACLEF - Merci</title></Head>
        <div style={cardStyle}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontSize: '28px', color: '#065f46', margin: '0 0 12px' }}>Merci !</h1>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>Vous avez déjà répondu à ce questionnaire.</p>
        </div>
      </div>
    )
  }

  if (termine) {
    return (
      <div style={pageStyle}>
        <Head><title>ACLEF - Merci !</title></Head>
        <div style={cardStyle}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontSize: '32px', color: '#065f46', margin: '0 0 12px' }}>Merci {prenom} !</h1>
          <p style={{ fontSize: '20px', color: '#6b7280', lineHeight: '1.5' }}>
            Votre réponse est enregistrée.
          </p>
          <div style={{ fontSize: '48px', marginTop: '24px' }}>✅</div>
        </div>
      </div>
    )
  }

  if (!questionActuelle) return null

  const titreQuestionnaire = typeQuestionnaire === 'satisfaction'
    ? 'Votre avis sur la formation'
    : 'Comment allez-vous ?'

  return (
    <div style={pageStyle}>
      <Head>
        <title>ACLEF - {titreQuestionnaire}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: '700', letterSpacing: '1px', marginBottom: '4px' }}>
            ACLEF
          </div>
          <h1 style={{ fontSize: '20px', color: '#1e293b', margin: '0 0 8px', fontWeight: '600' }}>
            {titreQuestionnaire}
          </h1>
          {prenom && (
            <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
              Bonjour {prenom} !
            </p>
          )}
        </div>

        {/* Barre de progression */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {questionsVisibles.map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              backgroundColor: i <= questionIndex ? '#3b82f6' : '#e2e8f0',
              transition: 'background-color 0.3s'
            }} />
          ))}
        </div>

        {/* Numero de question + bouton audio */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>
            Question {questionIndex + 1} / {totalQuestions}
          </span>
          <button
            onClick={lireQuestion}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid #3b82f6',
              backgroundColor: '#eff6ff',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Écouter la question"
          >
            🔊
          </button>
        </div>

        {/* Illustration + Texte de la question */}
        {questionActuelle.illustration && (
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>
            {questionActuelle.illustration}
          </div>
        )}
        <h2 style={{
          fontSize: '24px',
          color: '#1e293b',
          fontWeight: '700',
          marginBottom: '32px',
          lineHeight: '1.3'
        }}>
          {questionActuelle.text}
        </h2>

        {/* Reponses selon le type */}
        {questionActuelle.type === 'choix3' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { valeur: 'oui', emoji: '😊', label: 'OUI', couleur: '#10b981', bg: '#d1fae5' },
              { valeur: 'un_peu', emoji: '😐', label: 'UN PEU', couleur: '#f59e0b', bg: '#fef3c7' },
              { valeur: 'non', emoji: '😟', label: 'NON', couleur: '#ef4444', bg: '#fee2e2' }
            ].map(option => (
              <button
                key={option.valeur}
                onClick={() => selectionnerReponse(option.valeur)}
                style={{
                  padding: '20px',
                  fontSize: '22px',
                  fontWeight: '700',
                  border: reponses[questionActuelle.id] === option.valeur ? `3px solid ${option.couleur}` : '3px solid transparent',
                  borderRadius: '16px',
                  backgroundColor: reponses[questionActuelle.id] === option.valeur ? option.bg : '#f8fafc',
                  color: '#1e293b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  transform: reponses[questionActuelle.id] === option.valeur ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <span style={{ fontSize: '36px' }}>{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        )}

        {questionActuelle.type === 'situation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { valeur: 'formation', emoji: '🎓', label: 'En formation' },
              { valeur: 'emploi', emoji: '💼', label: 'Vous travaillez' },
              { valeur: 'recherche', emoji: '🔍', label: 'Vous cherchez du travail' },
              { valeur: 'autre', emoji: '❓', label: 'Autre' }
            ].map(option => (
              <button
                key={option.valeur}
                onClick={() => selectionnerReponse(option.valeur)}
                style={{
                  padding: '18px',
                  fontSize: '20px',
                  fontWeight: '600',
                  border: reponses[questionActuelle.id] === option.valeur ? '3px solid #3b82f6' : '3px solid transparent',
                  borderRadius: '16px',
                  backgroundColor: reponses[questionActuelle.id] === option.valeur ? '#dbeafe' : '#f8fafc',
                  color: '#1e293b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '32px' }}>{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        )}

        {questionActuelle.type === 'vocal' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            {!enregistrement && !audioURL && (
              <button
                onClick={demarrerEnregistrement}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '48px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                🎤
              </button>
            )}

            {enregistrement && (
              <>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'pulse 1.5s infinite'
                }}>
                  <span style={{ fontSize: '48px' }}>🎤</span>
                </div>
                <p style={{ fontSize: '18px', color: '#ef4444', fontWeight: '600' }}>
                  Enregistrement en cours...
                </p>
                <button
                  onClick={arreterEnregistrement}
                  style={{
                    padding: '16px 32px',
                    fontSize: '18px',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '12px',
                    backgroundColor: '#1e293b',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  ⏹ Arrêter
                </button>
              </>
            )}

            {audioURL && !enregistrement && (
              <>
                <div style={{ fontSize: '48px' }}>✅</div>
                <p style={{ fontSize: '16px', color: '#065f46', fontWeight: '600' }}>
                  Message enregistré !
                </p>
                <audio controls src={audioURL} style={{ width: '100%', maxWidth: '300px' }} />
                <button
                  onClick={() => {
                    setAudioURL(null)
                    setReponses(prev => {
                      const copy = { ...prev }
                      delete copy[questionActuelle.id]
                      return copy
                    })
                  }}
                  style={{
                    padding: '10px 24px',
                    fontSize: '16px',
                    border: '2px solid #94a3b8',
                    borderRadius: '10px',
                    backgroundColor: 'white',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Recommencer
                </button>
              </>
            )}

            <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
              Cette question est facultative
            </p>
          </div>
        )}

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '32px',
          gap: '12px'
        }}>
          {questionIndex > 0 ? (
            <button
              onClick={precedent}
              style={{
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: '600',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#64748b',
                cursor: 'pointer',
                flex: 1
              }}
            >
              ← Précédent
            </button>
          ) : <div style={{ flex: 1 }} />}

          {isLastQuestion ? (
            <button
              onClick={envoyerReponses}
              disabled={envoiEnCours}
              style={{
                padding: '14px 24px',
                fontSize: '18px',
                fontWeight: '700',
                border: 'none',
                borderRadius: '12px',
                backgroundColor: envoiEnCours ? '#94a3b8' : '#10b981',
                color: 'white',
                cursor: envoiEnCours ? 'not-allowed' : 'pointer',
                flex: 1
              }}
            >
              {envoiEnCours ? '⏳ Envoi...' : '✅ Envoyer'}
            </button>
          ) : (
            <button
              onClick={suivant}
              disabled={!reponses[questionActuelle.id] && questionActuelle.type !== 'vocal'}
              style={{
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '12px',
                backgroundColor: (reponses[questionActuelle.id] || questionActuelle.type === 'vocal') ? '#3b82f6' : '#cbd5e1',
                color: 'white',
                cursor: (reponses[questionActuelle.id] || questionActuelle.type === 'vocal') ? 'pointer' : 'not-allowed',
                flex: 1
              }}
            >
              Suivant →
            </button>
          )}
        </div>
      </div>

      {/* CSS animation pulse */}
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  )
}
