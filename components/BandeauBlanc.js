/**
 * Bandeau blanc vide - Composant réutilisable
 * Utilisé dans toutes les pages admin
 */
export default function BandeauBlanc() {
  return (
    <div className="no-print" style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px 20px',
      marginBottom: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
    }}>
      {/* Contenu du bandeau à définir */}
    </div>
  )
}
