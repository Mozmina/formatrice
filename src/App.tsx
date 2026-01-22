import React, { useState, useEffect, useMemo } from 'react';
import {
  Hammer,
  HardHat,
  Glasses,
  Ear,
  Footprints,
  Zap,
  Wind,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Eye,
  HandMetal,
  Shirt,
  Settings,
  Trash2,
  Save,
  Lock,
  Image as ImageIcon,
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: 'AIzaSyD1Zd2nL59GJRC5CE4r6X-S2y6eQvj8aHg',
  authDomain: 'rt2---formatrice.firebaseapp.com',
  projectId: 'rt2---formatrice',
  storageBucket: 'rt2---formatrice.firebasestorage.app',
  messagingSenderId: '861204084153',
  appId: '1:861204084153:web:3ae9704b898ef010087268',
  measurementId: 'G-00RZDNZSF5',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper for collection paths
// Using a fixed app ID for this specific deployment or getting from global if available
const APP_ID =
  typeof __app_id !== 'undefined' ? __app_id : 'safety-app-default';
const RESPONSES_COLLECTION = 'responses';
const CONFIG_COLLECTION = 'config';

const getResponsesRef = () =>
  collection(db, 'artifacts', APP_ID, 'public', 'data', RESPONSES_COLLECTION);
const getConfigRef = () =>
  collection(db, 'artifacts', APP_ID, 'public', 'data', CONFIG_COLLECTION);
const getScenarioDocRef = () =>
  doc(db, 'artifacts', APP_ID, 'public', 'data', CONFIG_COLLECTION, 'scenario');

// --- DATA CONSTANTS ---

const DANGERS_LIST = [
  { id: 'poussiere', label: 'Poussières', icon: <Wind size={20} /> },
  { id: 'bruit', label: 'Bruit', icon: <Ear size={20} /> },
  {
    id: 'projections',
    label: 'Projections',
    icon: <AlertTriangle size={20} />,
  },
  { id: 'chute', label: 'Chute de plain-pied', icon: <Footprints size={20} /> },
  {
    id: 'circulation',
    label: "Circulation d'autres personnes",
    icon: <Users size={20} />,
  },
  {
    id: 'outils',
    label: 'Outils électroportatifs',
    icon: <Hammer size={20} />,
  },
  { id: 'elec', label: 'Risque électrique', icon: <Zap size={20} /> },
];

const EPI_LIST = [
  { id: 'casque', label: 'Casque', icon: <HardHat size={20} /> },
  {
    id: 'lunettes',
    label: 'Lunettes de protection',
    icon: <Glasses size={20} />,
  },
  { id: 'gants', label: 'Gants', icon: <HandMetal size={20} /> },
  {
    id: 'chaussures',
    label: 'Chaussures de sécurité',
    icon: <Footprints size={20} />,
  },
  { id: 'auditif', label: 'Protections auditives', icon: <Ear size={20} /> },
  { id: 'masque', label: 'Masque respiratoire', icon: <Wind size={20} /> },
  { id: 'gilet', label: 'Gilet haute visibilité', icon: <Shirt size={20} /> },
];

const POSITIONS_INITIAL = [
  { id: 'oui', label: 'Oui, sans hésitation' },
  { id: 'partiel', label: 'Partiellement' },
  { id: 'non', label: "Non, j'ai douté" },
];

const POSITIONS_FINAL = [
  { id: 'maintien', label: 'Je maintiens mes choix' },
  { id: 'modif', label: 'Je modifie certains choix' },
  { id: 'change', label: "J'ai changé mon raisonnement" },
];

// --- COMPONENTS ---

const Card = ({ children, title, icon: Icon }) => (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 max-w-2xl w-full mx-auto animate-fade-in-up">
    <div className="bg-yellow-400 p-4 flex items-center space-x-3 text-slate-900">
      {Icon && <Icon size={24} className="text-slate-900" />}
      <h2 className="text-xl font-bold uppercase tracking-wide">{title}</h2>
    </div>
    <div className="p-6 md:p-8">{children}</div>
  </div>
);

const CheckboxGroup = ({ options, selected, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {options.map((opt) => (
      <label
        key={opt.id}
        className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
          selected.includes(opt.id)
            ? 'border-yellow-400 bg-yellow-50'
            : 'border-slate-200 hover:border-yellow-200'
        }`}
      >
        <div
          className={`w-5 h-5 rounded border flex items-center justify-center ${
            selected.includes(opt.id)
              ? 'bg-yellow-400 border-yellow-400'
              : 'border-slate-300'
          }`}
        >
          {selected.includes(opt.id) && (
            <CheckCircle2 size={14} className="text-white" />
          )}
        </div>
        <div className="text-slate-600">{opt.icon}</div>
        <span className="font-medium text-slate-700">{opt.label}</span>
        <input
          type="checkbox"
          className="hidden"
          checked={selected.includes(opt.id)}
          onChange={() => onChange(opt.id)}
        />
      </label>
    ))}
  </div>
);

const RadioGroup = ({ options, selected, onChange }) => (
  <div className="space-y-3">
    {options.map((opt) => (
      <label
        key={opt.id}
        className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
          selected === opt.id
            ? 'border-yellow-400 bg-yellow-50'
            : 'border-slate-200 hover:border-yellow-200'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
            selected === opt.id ? 'border-yellow-400' : 'border-slate-300'
          }`}
        >
          {selected === opt.id && (
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
          )}
        </div>
        <span className="font-medium text-slate-700">{opt.label}</span>
        <input
          type="radio"
          className="hidden"
          checked={selected === opt.id}
          onChange={() => onChange(opt.id)}
        />
      </label>
    ))}
  </div>
);

const ProgressBar = ({ label, percentage, highlight = false }) => (
  <div className="mb-4">
    <div className="flex justify-between text-sm mb-1">
      <span
        className={`font-medium ${
          highlight ? 'text-yellow-700 font-bold' : 'text-slate-600'
        }`}
      >
        {label}
      </span>
      <span className="text-slate-500">{percentage}%</span>
    </div>
    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${
          highlight ? 'bg-yellow-500' : 'bg-slate-400'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  </div>
);

// --- MAIN APPLICATION ---

export default function SafetyTrainingApp() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    dangers: [],
    epis: [],
    posInit: '',
    justifInit: '',
    posFinal: '',
    justifFinal: '',
  });

  // Real Data State
  const [groupData, setGroupData] = useState([]);
  const [scenarioConfig, setScenarioConfig] = useState({
    title: 'Chantier de rénovation intérieure',
    description:
      "Vous percez un mur pour fixer un support métallique.\n\nNote : D'autres corps de métier sont présents à proximité (électricien, peintre).",
    imageUrl: '',
  });

  // Admin State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminConfig, setAdminConfig] = useState(scenarioConfig);

  // --- FIREBASE EFFECTS ---

  // 1. Auth & Initial Load
  useEffect(() => {
    const initAuth = async () => {
      // Use existing token or anonymous auth
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        // await signInWithCustomToken(auth, __initial_auth_token); // Not strictly needed for anonymous apps but good practice if available
        await signInAnonymously(auth);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Configuration (Scenario)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(getScenarioDocRef(), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setScenarioConfig({
          title: data.title || 'Chantier de rénovation intérieure',
          description:
            data.description ||
            "Vous percez un mur pour fixer un support métallique.\n\nNote : D'autres corps de métier sont présents à proximité (électricien, peintre).",
          imageUrl: data.imageUrl || '',
        });
        setAdminConfig({
          title: data.title || 'Chantier de rénovation intérieure',
          description:
            data.description ||
            "Vous percez un mur pour fixer un support métallique.\n\nNote : D'autres corps de métier sont présents à proximité (électricien, peintre).",
          imageUrl: data.imageUrl || '',
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Fetch Group Responses (for Step 5 and Admin stats)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(getResponsesRef(), (snapshot) => {
      const responses = snapshot.docs.map((doc) => doc.data());
      setGroupData(responses);
    });
    return () => unsubscribe();
  }, [user]);

  // --- ACTIONS ---

  const toggleSelection = (category, id) => {
    setAnswers((prev) => {
      const current = prev[category];
      const updated = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      return { ...prev, [category]: updated };
    });
  };

  const handleTextChange = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = async () => {
    // Save intermediate data if needed, or just proceed
    if (step === 4) {
      // Submit initial part
      try {
        await addDoc(getResponsesRef(), {
          ...answers,
          timestamp: new Date().toISOString(),
          userId: user.uid,
          completed: false,
        });
      } catch (e) {
        console.error('Error saving step 4', e);
      }
    }

    if (step === 7) {
      // Submit final part (update is harder with just addDoc, so we might just add a new doc or we'd need to track document ID.
      // For this simple app, adding a new complete record is safer for analysis or we just trust the final state logic)
      // Let's just re-save the full object as a "completed" entry for simplicity in this no-backend context
      try {
        await addDoc(getResponsesRef(), {
          ...answers,
          timestamp: new Date().toISOString(),
          userId: user.uid,
          completed: true,
        });
      } catch (e) {
        console.error('Error saving step 7', e);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep((prev) => prev + 1);
  };

  const resetApp = () => {
    setStep(1);
    setAnswers({
      dangers: [],
      epis: [],
      posInit: '',
      justifInit: '',
      posFinal: '',
      justifFinal: '',
    });
  };

  // --- ADMIN ACTIONS ---

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'power') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert('Mot de passe incorrect');
    }
  };

  const saveConfiguration = async () => {
    try {
      await setDoc(getScenarioDocRef(), adminConfig);
      alert('Configuration sauvegardée !');
    } catch (e) {
      console.error('Error saving config', e);
      alert('Erreur lors de la sauvegarde.');
    }
  };

  const clearDatabase = async () => {
    if (
      confirm(
        'Êtes-vous sûr de vouloir effacer TOUTES les réponses des apprenants ? Cette action est irréversible.'
      )
    ) {
      try {
        const querySnapshot = await getDocs(getResponsesRef());
        const batch = db.batch || null; // Creating a batch if possible, or loop delete
        // Simple loop delete for safety and ease in this context
        const deletePromises = querySnapshot.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        alert('Base de données effacée.');
      } catch (e) {
        console.error('Error clearing DB', e);
        alert('Erreur lors de la suppression.');
      }
    }
  };

  // --- CALCULATED STATS (REAL TIME) ---

  const stats = useMemo(() => {
    if (groupData.length === 0) return null;

    const total = groupData.length;

    const calculateStats = (list, categoryField) => {
      return list
        .map((item) => {
          const count = groupData.filter(
            (r) => r[categoryField] && r[categoryField].includes(item.id)
          ).length;
          return {
            ...item,
            value: Math.round((count / total) * 100),
          };
        })
        .sort((a, b) => b.value - a.value);
    };

    const dangers = calculateStats(DANGERS_LIST, 'dangers');
    const epis = calculateStats(EPI_LIST, 'epis');

    // Positions stats
    const posCounts = {
      oui: groupData.filter((r) => r.posInit === 'oui').length,
      partiel: groupData.filter((r) => r.posInit === 'partiel').length,
      non: groupData.filter((r) => r.posInit === 'non').length,
    };

    const positions = [
      {
        label: 'Oui, sans hésitation',
        value: Math.round((posCounts.oui / total) * 100),
      },
      {
        label: 'Partiellement',
        value: Math.round((posCounts.partiel / total) * 100),
      },
      {
        label: "Non, j'ai douté",
        value: Math.round((posCounts.non / total) * 100),
      },
    ];

    return { dangers, epis, positions };
  }, [groupData]);

  // --- RENDERERS FOR EACH STEP ---

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card title="Situation Professionnelle" icon={Activity}>
            <div className="space-y-6">
              <div className="bg-slate-100 p-6 rounded-lg border border-slate-200">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center w-full md:w-1/3 h-48 text-slate-300 overflow-hidden relative">
                    {scenarioConfig.imageUrl ? (
                      <img
                        src={scenarioConfig.imageUrl}
                        alt="Situation Chantier"
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <div
                      className="text-center absolute inset-0 flex flex-col items-center justify-center bg-white"
                      style={{
                        display: scenarioConfig.imageUrl ? 'none' : 'flex',
                      }}
                    >
                      <Hammer
                        size={48}
                        className="mx-auto mb-2 text-yellow-500"
                      />
                      <span className="text-sm font-medium text-slate-500 block">
                        Illustration Chantier
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4 text-slate-700 whitespace-pre-line">
                    <h3 className="font-bold text-lg border-l-4 border-yellow-400 pl-4">
                      {scenarioConfig.title}
                    </h3>
                    <div className="text-slate-600">
                      {scenarioConfig.description}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={nextStep}
                className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                Commencer l'analyse <ArrowRight size={20} />
              </button>
            </div>
          </Card>
        );

      case 2:
        return (
          <Card title="Identification des Dangers" icon={ShieldAlert}>
            <p className="mb-6 text-slate-600 text-lg">
              Quels dangers identifies-tu dans cette situation précise ?
            </p>
            <CheckboxGroup
              options={DANGERS_LIST}
              selected={answers.dangers}
              onChange={(id) => toggleSelection('dangers', id)}
            />
            <div className="mt-8 flex justify-end">
              <button
                onClick={nextStep}
                disabled={answers.dangers.length === 0}
                className={`px-8 py-3 rounded-lg font-bold transition-all ${
                  answers.dangers.length > 0
                    ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-500'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Valider mes choix
              </button>
            </div>
          </Card>
        );

      case 3:
        return (
          <Card title="Choix des EPI" icon={HardHat}>
            <p className="mb-6 text-slate-600 text-lg">
              Quels EPI te semblent{' '}
              <span className="font-bold">nécessaires</span> pour cette
              intervention ?
            </p>
            <CheckboxGroup
              options={EPI_LIST}
              selected={answers.epis}
              onChange={(id) => toggleSelection('epis', id)}
            />
            <div className="mt-8 flex justify-end">
              <button
                onClick={nextStep}
                disabled={answers.epis.length === 0}
                className={`px-8 py-3 rounded-lg font-bold transition-all ${
                  answers.epis.length > 0
                    ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-500'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Continuer
              </button>
            </div>
          </Card>
        );

      case 4:
        return (
          <Card title="Auto-positionnement Initial" icon={Activity}>
            <p className="mb-4 text-slate-600 font-medium">
              Sur cette situation, je me sens capable de justifier mes choix
              d’EPI :
            </p>

            <RadioGroup
              options={POSITIONS_INITIAL}
              selected={answers.posInit}
              onChange={(val) => handleTextChange('posInit', val)}
            />

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Explique brièvement ton positionnement :
              </label>
              <textarea
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none min-h-[100px]"
                placeholder="Je pense avoir choisi..."
                value={answers.justifInit}
                onChange={(e) => handleTextChange('justifInit', e.target.value)}
              />
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={nextStep}
                disabled={!answers.posInit || !answers.justifInit}
                className={`px-8 py-3 rounded-lg font-bold transition-all ${
                  answers.posInit && answers.justifInit
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Envoyer
              </button>
            </div>
          </Card>
        );

      case 5:
        return (
          <Card title="Réflexion Collective" icon={Users}>
            <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg flex items-start gap-3">
              <Eye className="mt-1 flex-shrink-0" size={20} />
              <p className="text-sm">
                Voici les tendances réelles du groupe. Observez les différences
                avec vos choix.
              </p>
            </div>

            {stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">
                    Dangers les plus identifiés
                  </h3>
                  {stats.dangers.slice(0, 5).map((d) => (
                    <ProgressBar
                      key={d.id}
                      label={d.label}
                      percentage={d.value}
                      highlight={answers.dangers.includes(d.id)}
                    />
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">
                    EPI les plus choisis
                  </h3>
                  {stats.epis.slice(0, 5).map((e) => (
                    <ProgressBar
                      key={e.id}
                      label={e.label}
                      percentage={e.value}
                      highlight={answers.epis.includes(e.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-slate-500 italic">
                En attente de données du groupe...
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">
                Confiance du groupe
              </h3>
              {stats && (
                <>
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${stats.positions[0].value}%` }}
                      className="bg-green-400 h-full"
                    ></div>
                    <div
                      style={{ width: `${stats.positions[1].value}%` }}
                      className="bg-yellow-400 h-full"
                    ></div>
                    <div
                      style={{ width: `${stats.positions[2].value}%` }}
                      className="bg-red-400 h-full"
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Sûr ({stats.positions[0].value}%)</span>
                    <span>Partiel ({stats.positions[1].value}%)</span>
                    <span>Doute ({stats.positions[2].value}%)</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={nextStep}
                className="px-8 py-3 bg-yellow-400 text-slate-900 rounded-lg font-bold hover:bg-yellow-500 transition-all"
              >
                Poursuivre la réflexion
              </button>
            </div>
          </Card>
        );

      case 6:
        return (
          <Card title="Critères de Pertinence" icon={CheckCircle2}>
            <div className="space-y-6 text-slate-700">
              <p className="text-lg font-medium">
                Pour vous aider à vous repositionner, considérez ces critères :
              </p>

              <div className="bg-white border-l-4 border-green-500 shadow-sm p-6 rounded-r-lg space-y-4">
                <h3 className="font-bold text-lg text-slate-900">
                  Un choix d'EPI est pertinent si :
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="text-green-500 mt-1 shrink-0"
                    />
                    <span>
                      Chaque EPI répond à un danger{' '}
                      <span className="font-semibold">
                        réellement identifié
                      </span>
                      .
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="text-green-500 mt-1 shrink-0"
                    />
                    <span>
                      Aucun EPI n'est choisi simplement "par habitude" ou
                      automatisme.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="text-green-500 mt-1 shrink-0"
                    />
                    <span>
                      La situation{' '}
                      <span className="font-semibold">globale</span> (coactivité
                      avec peintres/électriciens) est prise en compte.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="text-green-500 mt-1 shrink-0"
                    />
                    <span>
                      Vous pourriez expliquer le "Pourquoi" à un collègue
                      sceptique.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={nextStep}
                className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all"
              >
                Me repositionner
              </button>
            </div>
          </Card>
        );

      case 7:
        return (
          <Card title="Auto-positionnement Final" icon={RefreshCw}>
            <p className="mb-4 text-slate-600 font-medium">
              Après avoir vu les tendances du groupe et lu les critères, comment
              te situes-tu maintenant ?
            </p>

            <RadioGroup
              options={POSITIONS_FINAL}
              selected={answers.posFinal}
              onChange={(val) => handleTextChange('posFinal', val)}
            />

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Explique ce qui a évolué (ou non) dans ton raisonnement :
              </label>
              <textarea
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none min-h-[100px]"
                placeholder="J'ai réalisé que..."
                value={answers.justifFinal}
                onChange={(e) =>
                  handleTextChange('justifFinal', e.target.value)
                }
              />
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={nextStep}
                disabled={!answers.posFinal || !answers.justifFinal}
                className={`px-8 py-3 rounded-lg font-bold transition-all ${
                  answers.posFinal && answers.justifFinal
                    ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-500'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Terminer
              </button>
            </div>
          </Card>
        );

      case 8:
        return (
          <div className="text-center max-w-lg mx-auto mt-12 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Analyse Terminée
            </h2>
            <p className="text-slate-600 mb-8">
              Merci pour votre participation. Vos réponses ont été enregistrées
              pour le débriefing collectif.
            </p>
            <div className="bg-white p-6 rounded-lg border border-slate-200 text-left mb-8 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-2">
                Résumé de votre évolution :
              </h4>
              <div className="text-sm text-slate-500 mb-1">Avant :</div>
              <p className="mb-3 italic text-slate-700">
                "{answers.justifInit}"
              </p>
              <div className="text-sm text-slate-500 mb-1">Après :</div>
              <p className="italic text-slate-700">"{answers.justifFinal}"</p>
            </div>

            <button
              onClick={resetApp}
              className="text-slate-400 hover:text-slate-600 underline text-sm"
            >
              Retour à l'accueil
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // --- LAYOUT ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12 relative">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-yellow-400 p-1.5 rounded text-slate-900">
              <HardHat size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-wider">
              SÉCURITÉ BTP{' '}
              <span className="font-normal text-slate-400">| Module 1</span>
            </h1>
          </div>
          <div className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300">
            Étape {step > 8 ? 8 : step} / 7
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {isAdmin ? (
          <Card title="Administration" icon={Settings}>
            <div className="space-y-6">
              <div className="p-4 bg-slate-100 rounded border">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <ImageIcon size={18} /> Configuration Scénario
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Titre
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      value={adminConfig.title}
                      onChange={(e) =>
                        setAdminConfig({
                          ...adminConfig,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full p-2 border rounded min-h-[100px]"
                      value={adminConfig.description}
                      onChange={(e) =>
                        setAdminConfig({
                          ...adminConfig,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      URL Image (Optionnel)
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      placeholder="https://exemple.com/image.jpg"
                      value={adminConfig.imageUrl}
                      onChange={(e) =>
                        setAdminConfig({
                          ...adminConfig,
                          imageUrl: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button
                    onClick={saveConfiguration}
                    className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                  >
                    <Save size={16} /> Sauvegarder Config
                  </button>
                </div>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  <Trash2 size={18} /> Zone de Danger
                </h3>
                <p className="text-sm text-red-600 mb-4">
                  Attention, cette action supprimera toutes les réponses des
                  apprenants.
                </p>
                <button
                  onClick={clearDatabase}
                  className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700"
                >
                  <Trash2 size={16} /> Vider la base de données
                </button>
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={() => setIsAdmin(false)}
                  className="text-slate-600 underline"
                >
                  Quitter le mode Admin
                </button>
              </div>
            </div>
          </Card>
        ) : (
          renderStep()
        )}
      </main>

      {/* Footer for Context */}
      <footer className="text-center text-slate-400 text-xs py-4">
        <p className="mb-2">
          Application à visée pédagogique - Évaluation Formatrice
        </p>
        <button
          onClick={() => setShowAdminLogin(true)}
          className="text-slate-300 hover:text-slate-500 transition-colors"
        >
          Admin
        </button>
      </footer>

      {/* Admin Login Modal */}
      {showAdminLogin && !isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Lock size={20} /> Accès Admin
            </h3>
            <form onSubmit={handleAdminLogin}>
              <input
                type="password"
                placeholder="Mot de passe"
                className="w-full p-2 border rounded mb-4"
                autoFocus
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
