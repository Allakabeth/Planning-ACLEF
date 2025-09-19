import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { withAuthAdmin } from '../components/withAuthAdmin';

// Skeleton Loader spécifique à la gestion des absences apprenants
const SkeletonAbsenceLoader = () => {
  const shimmer = {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 60px'
    }}>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Header Navigation Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '15px 25px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          height: '16px',
          width: '250px',
          borderRadius: '4px',
          ...shimmer
        }} />

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{
            height: '32px',
            width: '80px',
            borderRadius: '8px',
            ...shimmer
          }} />
          <div style={{
            height: '24px',
            width: '160px',
            borderRadius: '6px',
            ...shimmer
          }} />
          <div style={{
            height: '32px',
            width: '100px',
            borderRadius: '6px',
            ...shimmer
          }} />
        </div>
      </div>

      {/* Titre principal Skeleton */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{
          height: '32px',
          width: '320px',
          borderRadius: '4px',
          margin: '0 auto 10px',
          ...shimmer
        }} />
        <div style={{
          height: '16px',
          width: '480px',
          borderRadius: '4px',
          margin: '0 auto',
          ...shimmer
        }} />
      </div>

      {/* Formulaire Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          height: '24px',
          width: '200px',
          borderRadius: '4px',
          marginBottom: '20px',
          ...shimmer
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div style={{
                height: '16px',
                width: '100px',
                borderRadius: '4px',
                marginBottom: '8px',
                ...shimmer
              }} />
              <div style={{
                height: '40px',
                width: '100%',
                borderRadius: '6px',
                ...shimmer
              }} />
            </div>
          ))}
        </div>

        <div style={{
          height: '40px',
          width: '150px',
          borderRadius: '6px',
          ...shimmer
        }} />
      </div>

      {/* Liste Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '15px 0',
            borderBottom: i < 4 ? '1px solid #f0f0f0' : 'none'
          }}>
            <div style={{
              height: '16px',
              width: '200px',
              borderRadius: '4px',
              ...shimmer
            }} />
            <div style={{
              height: '16px',
              width: '150px',
              borderRadius: '4px',
              ...shimmer
            }} />
            <div style={{
              height: '32px',
              width: '80px',
              borderRadius: '6px',
              ...shimmer
            }} />
          </div>
        ))}
      </div>
    </div>
  );
};

function AbsenceApprenant() {
  const [loading, setLoading] = useState(true);
  const [apprenants, setApprenants] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // État du formulaire
  const [formData, setFormData] = useState({
    type: 'absence_periode', // absence_periode, absence_ponctuelle, presence_exceptionnelle
    apprenant_id: '',
    date_debut: '',
    date_fin: '',
    date_specifique: '',
    creneau: '',
    lieu_id: '',
    motif: ''
  });

  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les apprenants
      const { data: apprenantsData, error: apprenantsError } = await supabase
        .from('users')
        .select('id, nom, prenom')
        .eq('role', 'apprenant')
        .eq('archive', false)
        .order('nom', { ascending: true });

      if (apprenantsError) throw apprenantsError;
      setApprenants(apprenantsData || []);

      // Charger les lieux
      const { data: lieuxData, error: lieuxError } = await supabase
        .from('lieux')
        .select('id, nom, initiale')
        .order('nom', { ascending: true });

      if (lieuxError) throw lieuxError;
      setLieux(lieuxData || []);

      // Charger les absences récentes
      await loadAbsences();

    } catch (error) {
      console.error('Erreur chargement données:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadAbsences = async () => {
    try {
      const response = await fetch('/api/admin/absences-apprenants');
      if (!response.ok) throw new Error('Erreur chargement absences');

      const data = await response.json();
      setAbsences(data);
    } catch (error) {
      console.error('Erreur chargement absences:', error);
      setError('Erreur lors du chargement des absences');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/absences-apprenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création');
      }

      setSuccess('Absence créée avec succès');
      setFormData({
        type: 'absence_periode',
        apprenant_id: '',
        date_debut: '',
        date_fin: '',
        date_specifique: '',
        creneau: '',
        lieu_id: '',
        motif: ''
      });

      await loadAbsences();
    } catch (error) {
      console.error('Erreur création absence:', error);
      setError(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette absence ?')) return;

    try {
      const response = await fetch(`/api/admin/absences-apprenants?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      setSuccess('Absence supprimée avec succès');
      await loadAbsences();
    } catch (error) {
      console.error('Erreur suppression:', error);
      setError('Erreur lors de la suppression');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'absence_periode': return '🗓️ Absence par période';
      case 'absence_ponctuelle': return '⏰ Absence ponctuelle';
      case 'presence_exceptionnelle': return '✨ Présence exceptionnelle';
      default: return type;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'absence_periode': return '#ff6b6b';
      case 'absence_ponctuelle': return '#ffa726';
      case 'presence_exceptionnelle': return '#66bb6a';
      default: return '#757575';
    }
  };

  if (loading) {
    return <SkeletonAbsenceLoader />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 60px'
    }}>
      {/* Header Navigation */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '15px 25px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <div>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ← Retour au tableau de bord
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>👤 Administrateur</span>
          <button
            onClick={() => router.push('/api/auth/logout')}
            style={{
              backgroundColor: '#ff4757',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Titre principal */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '10px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          🎓 Gestion des Absences Apprenants
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.1rem',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          Gérer les absences par période, ponctuelles et les présences exceptionnelles
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: '#c62828'
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: '#2e7d32'
        }}>
          ✅ {success}
        </div>
      )}

      {/* Formulaire de création */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#333' }}>
          ➕ Nouvelle absence/présence
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Type */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Type d'événement
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              >
                <option value="absence_periode">🗓️ Absence par période</option>
                <option value="absence_ponctuelle">⏰ Absence ponctuelle</option>
                <option value="presence_exceptionnelle">✨ Présence exceptionnelle</option>
              </select>
            </div>

            {/* Apprenant */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Apprenant
              </label>
              <select
                name="apprenant_id"
                value={formData.apprenant_id}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              >
                <option value="">Sélectionner un apprenant</option>
                {apprenants.map(apprenant => (
                  <option key={apprenant.id} value={apprenant.id}>
                    {apprenant.prenom} {apprenant.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Lieu (pour présence exceptionnelle) */}
            {formData.type === 'presence_exceptionnelle' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Lieu
                </label>
                <select
                  name="lieu_id"
                  value={formData.lieu_id}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                >
                  <option value="">Sélectionner un lieu</option>
                  {lieux.map(lieu => (
                    <option key={lieu.id} value={lieu.id}>
                      {lieu.nom} ({lieu.initiale})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Dates selon le type */}
          <div style={{ display: 'grid', gridTemplateColumns: formData.type === 'absence_periode' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {formData.type === 'absence_periode' ? (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    Date de début
                  </label>
                  <input
                    type="date"
                    name="date_debut"
                    value={formData.date_debut}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    Date de fin
                  </label>
                  <input
                    type="date"
                    name="date_fin"
                    value={formData.date_fin}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    name="date_specifique"
                    value={formData.date_specifique}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    Créneau
                  </label>
                  <select
                    name="creneau"
                    value={formData.creneau}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '16px'
                    }}
                  >
                    <option value="">Sélectionner</option>
                    <option value="matin">Matin</option>
                    <option value="AM">Après-midi</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Motif */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Motif (optionnel)
            </label>
            <textarea
              name="motif"
              value={formData.motif}
              onChange={handleInputChange}
              rows="3"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '16px',
                resize: 'vertical'
              }}
              placeholder="Motif de l'absence ou présence exceptionnelle..."
            />
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            💾 Enregistrer
          </button>
        </form>
      </div>

      {/* Liste des absences */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#333' }}>
          📋 Absences récentes
        </h2>

        {absences.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
            Aucune absence enregistrée
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Apprenant</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date(s)</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Détails</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Motif</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {absences.map((absence, index) => (
                  <tr key={absence.id} style={{
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9',
                    borderBottom: '1px solid #eee'
                  }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{absence.apprenant_nom}</strong>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: getTypeColor(absence.type) + '20',
                        color: getTypeColor(absence.type),
                        fontWeight: 'bold'
                      }}>
                        {getTypeLabel(absence.type)}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {absence.date_affichage}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {absence.creneau_affichage && (
                        <div>{absence.creneau_affichage}</div>
                      )}
                      {absence.lieu_nom && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          📍 {absence.lieu_nom}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', maxWidth: '200px' }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        color: '#666'
                      }}>
                        {absence.motif || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(absence.id)}
                        style={{
                          backgroundColor: '#ff4757',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuthAdmin(AbsenceApprenant);