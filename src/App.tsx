import { useState, useEffect } from 'react';
import { 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Lock, 
  Image as ImageIcon, 
  BarChart3, 
  HelpCircle, 
  Play, 
  Pause, 
  LayoutList, 
  UserCheck, 
  Users, 
  LogOut, 
  ArrowLeft
} from 'lucide-react';

// Imports Firebase
import { initializeApp, type FirebaseApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type User, type Auth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  onSnapshot, 
  getDoc, 
  type Firestore 
} from 'firebase/firestore';

// --- CONFIGURATION ---
// Configuration injectée ou fallback
declare const __app_id: string | undefined;

// Use the provided config directly.
const firebaseConfig = {
  apiKey: "AIzaSyD1Zd2nL59GJRC5CE4r6X-S2y6eQvj8aHg",
  authDomain: "rt2---formatrice.firebaseapp.com",
  projectId: "rt2---formatrice",
  storageBucket: "rt2---formatrice.firebasestorage.app",
  messagingSenderId: "861204084153",
  appId: "1:861204084153:web:3ae9704b898ef010087268",
  measurementId: "G-00RZDNZSF5"
};

// Initialisation Singleton
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp(firebaseConfig);
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error", e);
  throw e;
}

const APP_ID = (typeof __app_id !== 'undefined' ? __app_id : 'safety-app-default').replace(/[\/.]/g, '_');

// --- PATHS CORRIGÉS (Structure plate) ---
// Règle stricte: artifacts/{APP_ID}/public/data/{COLLECTION}
const DATA_ROOT = `artifacts/${APP_ID}/public/data`;

const EVALUATIONS_COLLECTION = `${DATA_ROOT}/evaluations`;
const RESPONSES_COLLECTION = `${DATA_ROOT}/responses`; // Collection unique pour toutes les réponses
const CONFIG_COLLECTION = `${DATA_ROOT}/config`;
const GLOBAL_CONFIG_DOC_PATH = `${CONFIG_COLLECTION}/global`;

// --- TYPES ---

type StepType = 'situation' | 'question' | 'self-eval' | 'results';

interface StepBase {
  id: string;
  type: StepType;
  title: string;
}

interface StepSituation extends StepBase {
  type: 'situation';
  description: string;
  imageUrl: string;
}

interface StepQuestion extends StepBase {
  type: 'question';
  question: string;
  options: { id: string; label: string }[];
  multiple: boolean;
}

interface StepSelfEval extends StepBase {
  type: 'self-eval';
  prompt: string; // "Comment vous sentez-vous ?"
  minLabel: string;
  maxLabel: string;
}

interface StepResults extends StepBase {
  type: 'results';
  targetStepIds: string[]; // IDs des questions à afficher
}

type Step = StepSituation | StepQuestion | StepSelfEval | StepResults;

interface Evaluation {
  id: string;
  title: string;
  createdAt: string;
  steps: Step[];
}

// --- UTILS ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- COMPOSANTS ADMIN ---

const StepIcon = ({ type, size=20 }: { type: StepType, size?: number }) => {
  switch (type) {
    case 'situation': return <ImageIcon size={size} className="text-blue-500" />;
    case 'question': return <HelpCircle size={size} className="text-yellow-500" />;
    case 'self-eval': return <UserCheck size={size} className="text-purple-500" />;
    case 'results': return <BarChart3 size={size} className="text-green-500" />;
  }
};

const Timeline = ({ steps, activeStepId, onSelect, onMove, onDelete, onAdd }: any) => {
  return (
    <div className="relative">
      {/* Ligne connectrice */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
      
      <div className="flex gap-4 overflow-x-auto py-6 px-2 relative z-10 timeline-scroll items-center">
        {steps.map((step: Step, idx: number) => (
          <div key={step.id} className="group relative flex flex-col items-center flex-shrink-0">
            <button
              onClick={() => onSelect(step.id)}
              className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all shadow-sm ${
                activeStepId === step.id 
                  ? 'bg-white border-slate-800 scale-110 shadow-lg' 
                  : 'bg-slate-50 border-slate-300 hover:border-slate-400'
              }`}
            >
              <StepIcon type={step.type} />
            </button>
            <div className="absolute -top-8 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {idx + 1}. {step.title}
            </div>
            
            {/* Controls miniature */}
            {activeStepId === step.id && (
              <div className="absolute -bottom-10 flex gap-1 bg-white shadow rounded-full p-1">
                <button onClick={(e) => { e.stopPropagation(); onMove(idx, -1); }} disabled={idx === 0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ArrowLeft size={12}/></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(idx); }} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={12}/></button>
                <button onClick={(e) => { e.stopPropagation(); onMove(idx, 1); }} disabled={idx === steps.length - 1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ArrowRight size={12}/></button>
              </div>
            )}
          </div>
        ))}

        {/* Bouton Ajouter */}
        <div className="relative group">
          <button className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors border-2 border-dashed border-slate-400 text-slate-500">
            <Plus size={20} />
          </button>
          {/* Menu déroulant au survol/clic pour ajouter */}
          <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 p-2 hidden group-hover:block w-48 z-20">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase px-2">Ajouter une étape</p>
            <button onClick={() => onAdd('situation')} className="w-full text-left p-2 hover:bg-blue-50 text-slate-700 rounded flex items-center gap-2 text-sm"><ImageIcon size={16} /> Situation</button>
            <button onClick={() => onAdd('question')} className="w-full text-left p-2 hover:bg-yellow-50 text-slate-700 rounded flex items-center gap-2 text-sm"><HelpCircle size={16} /> Question</button>
            <button onClick={() => onAdd('self-eval')} className="w-full text-left p-2 hover:bg-purple-50 text-slate-700 rounded flex items-center gap-2 text-sm"><UserCheck size={16} /> Auto-Éval</button>
            <button onClick={() => onAdd('results')} className="w-full text-left p-2 hover:bg-green-50 text-slate-700 rounded flex items-center gap-2 text-sm"><BarChart3 size={16} /> Résultats</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepEditor = ({ step, onChange }: { step: Step, onChange: (s: Step) => void }) => {
  if (!step) return <div className="text-slate-400 text-center py-10">Sélectionnez une étape pour l'éditer</div>;

  const handleChange = (field: string, value: any) => {
    onChange({ ...step, [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 animate-fade-in">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
        <StepIcon type={step.type} size={24} />
        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Édition : {step.type}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Titre de l'étape</label>
          <input 
            value={step.title} 
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
          />
        </div>

        {step.type === 'situation' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description / Contexte</label>
              <textarea 
                value={(step as StepSituation).description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL Image (Optionnel)</label>
              <input 
                value={(step as StepSituation).imageUrl}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                placeholder="https://..."
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
          </>
        )}

        {step.type === 'question' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question posée</label>
              <input 
                value={(step as StepQuestion).question}
                onChange={(e) => handleChange('question', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="multi"
                checked={(step as StepQuestion).multiple}
                onChange={(e) => handleChange('multiple', e.target.checked)}
                className="w-4 h-4 text-slate-900 focus:ring-slate-900 border-gray-300 rounded"
              />
              <label htmlFor="multi" className="text-sm text-slate-700">Choix multiples autorisés</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Options de réponse</label>
              <div className="space-y-2">
                {(step as StepQuestion).options.map((opt, idx) => (
                  <div key={opt.id} className="flex gap-2">
                    <input 
                      value={opt.label}
                      onChange={(e) => {
                        const newOpts = [...(step as StepQuestion).options];
                        newOpts[idx].label = e.target.value;
                        handleChange('options', newOpts);
                      }}
                      className="flex-1 p-2 border border-slate-300 rounded text-sm"
                      placeholder={`Option ${idx + 1}`}
                    />
                    <button 
                      onClick={() => {
                        const newOpts = (step as StepQuestion).options.filter((_, i) => i !== idx);
                        handleChange('options', newOpts);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const newOpts = [...(step as StepQuestion).options, { id: generateId(), label: '' }];
                    handleChange('options', newOpts);
                  }}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2"
                >
                  <Plus size={14} /> Ajouter une option
                </button>
              </div>
            </div>
          </>
        )}

        {step.type === 'self-eval' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Consigne</label>
              <input 
                value={(step as StepSelfEval).prompt}
                onChange={(e) => handleChange('prompt', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="Ex: Êtes-vous sûr de vos choix ?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Label Min (Doute)</label>
                <input 
                  value={(step as StepSelfEval).minLabel}
                  onChange={(e) => handleChange('minLabel', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Label Max (Certitude)</label>
                <input 
                  value={(step as StepSelfEval).maxLabel}
                  onChange={(e) => handleChange('maxLabel', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
            </div>
          </>
        )}

        {step.type === 'results' && (
          <div className="bg-green-50 p-4 rounded text-sm text-green-800">
            <p>Cette étape affichera automatiquement les statistiques agrégées des questions précédentes pour le groupe.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPOSANT ADMIN MAIN ---

const AdminDashboard = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeEvalId, setActiveEvalId] = useState<string | null>(null);
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Liste des évaluations
    const unsubEvals = onSnapshot(collection(db, EVALUATIONS_COLLECTION), (snap) => {
      const evals = snap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));
      setEvaluations(evals);
    }, (error) => console.error("Error fetching evals:", error));

    // Config globale
    const unsubGlobal = onSnapshot(doc(db, GLOBAL_CONFIG_DOC_PATH), (snap) => {
      if (snap.exists()) {
        setActiveEvalId(snap.data().activeEvaluationId);
      }
    }, (error) => console.error("Error fetching global config:", error));

    return () => { unsubEvals(); unsubGlobal(); };
  }, []);

  const handleCreateEval = async () => {
    const newId = generateId();
    const newEval: Evaluation = {
      id: newId,
      title: "Nouvelle Évaluation",
      createdAt: new Date().toISOString(),
      steps: [
        { id: generateId(), type: 'situation', title: 'Mise en situation', description: '', imageUrl: '' } as StepSituation
      ]
    };
    await setDoc(doc(db, EVALUATIONS_COLLECTION, newId), newEval);
    setSelectedEval(newEval);
    setActiveStepId(newEval.steps[0].id);
  };

  const handleSaveEval = async () => {
    if (!selectedEval) return;
    setIsSaving(true);
    await setDoc(doc(db, EVALUATIONS_COLLECTION, selectedEval.id), selectedEval);
    setIsSaving(false);
  };

  const handleActivate = async (id: string | null) => {
    await setDoc(doc(db, GLOBAL_CONFIG_DOC_PATH), { activeEvaluationId: id }, { merge: true });
  };

  // Logique d'édition des steps
  const updateStep = (newStep: Step) => {
    if (!selectedEval) return;
    const newSteps = selectedEval.steps.map(s => s.id === newStep.id ? newStep : s);
    setSelectedEval({ ...selectedEval, steps: newSteps });
  };

  const addStep = (type: StepType) => {
    if (!selectedEval) return;
    const newStepBase = { id: generateId(), type, title: 'Nouvelle étape' };
    let newStep: Step;
    
    if (type === 'situation') newStep = { ...newStepBase, description: '', imageUrl: '' } as StepSituation;
    else if (type === 'question') newStep = { ...newStepBase, question: '', options: [{id: generateId(), label: 'Oui'}, {id: generateId(), label: 'Non'}], multiple: false } as StepQuestion;
    else if (type === 'self-eval') newStep = { ...newStepBase, prompt: 'Justifiez votre choix', minLabel: 'Pas sûr', maxLabel: 'Sûr' } as StepSelfEval;
    else newStep = { ...newStepBase, targetStepIds: [] } as StepResults;

    const newSteps = [...selectedEval.steps, newStep];
    setSelectedEval({ ...selectedEval, steps: newSteps });
    setActiveStepId(newStep.id);
  };

  const deleteStep = (index: number) => {
    if (!selectedEval) return;
    const newSteps = selectedEval.steps.filter((_, i) => i !== index);
    setSelectedEval({ ...selectedEval, steps: newSteps });
    if (newSteps.length > 0) setActiveStepId(newSteps[Math.max(0, index - 1)].id);
    else setActiveStepId(null);
  };

  const moveStep = (index: number, direction: number) => {
    if (!selectedEval) return;
    const newSteps = [...selectedEval.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + direction];
    newSteps[index + direction] = temp;
    setSelectedEval({ ...selectedEval, steps: newSteps });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0">
        <div className="p-4 border-b border-slate-800 font-bold text-white flex items-center gap-2">
          <Settings className="text-yellow-400" /> ADMIN
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <button 
            onClick={handleCreateEval}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 rounded mb-4 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Créer
          </button>
          
          {evaluations.map(ev => (
            <div 
              key={ev.id} 
              onClick={() => { setSelectedEval(ev); setActiveStepId(ev.steps[0]?.id); }}
              className={`p-3 rounded cursor-pointer transition-all border ${
                selectedEval?.id === ev.id 
                  ? 'bg-slate-800 border-yellow-500 text-white shadow-md' 
                  : 'bg-slate-900 border-transparent hover:bg-slate-800'
              }`}
            >
              <div className="font-bold truncate">{ev.title}</div>
              <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
                <span>{ev.steps.length} étapes</span>
                {activeEvalId === ev.id && <span className="text-green-400 flex items-center gap-1"><Activity size={10}/> EN LIGNE</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800 text-xs text-center text-slate-500">
          Formatrice v2.0
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedEval ? (
          <>
            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-20">
              <div className="flex items-center gap-4">
                <input 
                  value={selectedEval.title} 
                  onChange={(e) => setSelectedEval({...selectedEval, title: e.target.value})}
                  className="text-xl font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-yellow-500 outline-none px-1"
                />
                {activeEvalId === selectedEval.id ? (
                  <button onClick={() => handleActivate(null)} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-green-200">
                    <Pause size={12} /> SESSION ACTIVE
                  </button>
                ) : (
                  <button onClick={() => handleActivate(selectedEval.id)} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-slate-200">
                    <Play size={12} /> ACTIVER LA SESSION
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveEval} 
                  className="bg-slate-900 text-white px-4 py-2 rounded font-medium hover:bg-slate-700 flex items-center gap-2 shadow-sm"
                >
                  <Save size={18} /> {isSaving ? '...' : 'Sauvegarder'}
                </button>
              </div>
            </div>

            {/* TIMELINE */}
            <div className="bg-slate-100 border-b border-slate-200 p-4 shadow-inner">
              <Timeline 
                steps={selectedEval.steps} 
                activeStepId={activeStepId} 
                onSelect={setActiveStepId}
                onMove={moveStep}
                onDelete={deleteStep}
                onAdd={addStep}
              />
            </div>

            {/* EDITOR */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto">
                {activeStepId ? (
                  <StepEditor 
                    step={selectedEval.steps.find(s => s.id === activeStepId)!} 
                    onChange={updateStep} 
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                    Sélectionnez une étape dans la timeline pour commencer
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <LayoutList size={64} className="mb-4 opacity-20" />
            <p>Sélectionnez ou créez une évaluation</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPOSANT USER PLAYER ---

const UserPlayer = ({ evalData, user }: { evalData: Evaluation, user: User }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [groupStats, setGroupStats] = useState<any>(null); // Pour l'étape résultats

  const step = evalData.steps[currentStepIndex];
  const isLastStep = currentStepIndex === evalData.steps.length - 1;

  // Sync answers to Firebase on change (Correction: Use flattened collection + composite ID)
  useEffect(() => {
    if (!user || Object.keys(answers).length === 0) return;
    
    // Composite ID: One record per user per evaluation
    const docId = `${evalData.id}_${user.uid}`;
    const docRef = doc(db, RESPONSES_COLLECTION, docId);
    
    setDoc(docRef, { 
      evaluationId: evalData.id, // Mandatory for filtering
      userId: user.uid, 
      answers, 
      updatedAt: new Date().toISOString() 
    }, { merge: true }).catch(err => console.error("Error saving answers:", err));
  }, [answers, user, evalData.id]);

  // Fetch stats ONLY if current step is Results (Correction: Fetch all and filter in JS)
  useEffect(() => {
    if (step.type === 'results') {
      const q = collection(db, RESPONSES_COLLECTION);
      const unsub = onSnapshot(q, (snap) => {
        // FILTER CLIENT SIDE (Rule 2 of Instructions)
        const filteredResponses = snap.docs
          .map(d => d.data())
          .filter((d: any) => d.evaluationId === evalData.id);
          
        const allAnswers = filteredResponses.map((r: any) => r.answers);
        setGroupStats(allAnswers);
      }, (error) => {
        console.error("Error fetching group stats:", error);
      });
      return () => unsub();
    }
  }, [step.type, evalData.id]);

  const handleAnswer = (val: any) => {
    setAnswers(prev => ({ ...prev, [step.id]: val }));
  };

  const next = () => {
    if (!isLastStep) {
      window.scrollTo(0,0);
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const renderStepContent = () => {
    switch (step.type) {
      case 'situation':
        return (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-blue-600 p-4 text-white flex items-center gap-3">
              <ImageIcon />
              <h2 className="text-xl font-bold uppercase">{step.title}</h2>
            </div>
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
              {(step as StepSituation).imageUrl && (
                <img 
                  src={(step as StepSituation).imageUrl} 
                  className="w-full md:w-1/2 h-64 object-cover rounded-lg shadow-md bg-slate-100" 
                  alt="Situation"
                />
              )}
              <div className="flex-1 text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                {(step as StepSituation).description}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={next} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow transition-transform active:scale-95 flex items-center gap-2">
                Commencer <ArrowRight />
              </button>
            </div>
          </div>
        );

      case 'question':
        const qStep = step as StepQuestion;
        const currentAns = answers[step.id] || (qStep.multiple ? [] : null);
        
        const toggleOption = (optId: string) => {
          if (qStep.multiple) {
            const arr = currentAns as string[];
            if (arr.includes(optId)) handleAnswer(arr.filter(id => id !== optId));
            else handleAnswer([...arr, optId]);
          } else {
            handleAnswer(optId);
          }
        };

        return (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in max-w-2xl mx-auto">
            <div className="bg-yellow-400 p-4 text-slate-900 flex items-center gap-3">
              <HelpCircle />
              <h2 className="text-xl font-bold uppercase">{step.title}</h2>
            </div>
            <div className="p-8">
              <h3 className="text-xl font-medium text-slate-800 mb-6">{qStep.question}</h3>
              <div className="space-y-3">
                {qStep.options.map(opt => {
                  const isSelected = qStep.multiple 
                    ? (currentAns as string[]).includes(opt.id)
                    : currentAns === opt.id;
                  
                  return (
                    <div 
                      key={opt.id}
                      onClick={() => toggleOption(opt.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-yellow-400 bg-yellow-50 shadow-md' 
                          : 'border-slate-200 hover:border-yellow-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold text-slate-700">{opt.label}</span>
                      {isSelected && <CheckCircle2 className="text-yellow-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={next} 
                disabled={!currentAns || (Array.isArray(currentAns) && currentAns.length === 0)}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-bold shadow transition-transform active:scale-95 flex items-center gap-2"
              >
                Valider <ArrowRight />
              </button>
            </div>
          </div>
        );

      case 'self-eval':
        const seStep = step as StepSelfEval;
        const currentEval = answers[step.id] || { position: 50, justification: '' };

        return (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in max-w-2xl mx-auto">
            <div className="bg-purple-600 p-4 text-white flex items-center gap-3">
              <UserCheck />
              <h2 className="text-xl font-bold uppercase">{step.title}</h2>
            </div>
            <div className="p-8">
              <p className="text-lg text-slate-700 mb-8">{seStep.prompt}</p>
              
              <div className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex justify-between text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">
                  <span>{seStep.minLabel}</span>
                  <span>{seStep.maxLabel}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={currentEval.position}
                  onChange={(e) => handleAnswer({ ...currentEval, position: parseInt(e.target.value) })}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Pourquoi ce choix ?</label>
                <textarea 
                  value={currentEval.justification}
                  onChange={(e) => handleAnswer({ ...currentEval, justification: e.target.value })}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                  rows={3}
                  placeholder="Expliquez brièvement..."
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={next} 
                disabled={!currentEval.justification}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold shadow transition-transform active:scale-95 flex items-center gap-2"
              >
                Continuer <ArrowRight />
              </button>
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-green-600 p-4 text-white flex items-center gap-3">
              <BarChart3 />
              <h2 className="text-xl font-bold uppercase">Résultats du Groupe</h2>
            </div>
            <div className="p-8">
              {groupStats ? (
                <div className="space-y-8">
                  {/* On cherche les questions précédentes pour afficher leurs stats */}
                  {evalData.steps.filter(s => s.type === 'question').map(q => {
                    const qst = q as StepQuestion;
                    // Count stats
                    const counts: Record<string, number> = {};
                    qst.options.forEach(o => counts[o.id] = 0);
                    
                    groupStats.forEach((ans: any) => {
                      const val = ans[q.id];
                      if (Array.isArray(val)) val.forEach(v => counts[v] = (counts[v] || 0) + 1);
                      else if (val) counts[val] = (counts[val] || 0) + 1;
                    });

                    const total = groupStats.length || 1;

                    return (
                      <div key={q.id} className="border-b border-slate-100 pb-6 last:border-0">
                        <h4 className="font-bold text-slate-800 mb-4">{qst.question}</h4>
                        <div className="space-y-3">
                          {qst.options.map(opt => {
                            const pct = Math.round((counts[opt.id] / total) * 100);
                            return (
                              <div key={opt.id}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium text-slate-600">{opt.label}</span>
                                  <span className="font-bold text-slate-900">{pct}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-12">Chargement des données...</div>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={next} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-lg font-bold shadow flex items-center gap-2">
                Suite <ArrowRight />
              </button>
            </div>
          </div>
        );
        
      default: return null;
    }
  };

  if (currentStepIndex >= evalData.steps.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in p-4 text-center">
        <div className="bg-green-100 p-6 rounded-full mb-6 text-green-600">
          <CheckCircle2 size={64} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Évaluation Terminée</h2>
        <p className="text-slate-600 mb-8 max-w-md">Merci pour votre participation active. Vous pouvez maintenant attendre les consignes du formateur.</p>
        <button onClick={() => window.location.reload()} className="text-slate-400 hover:text-slate-600 text-sm underline">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      {/* Progress Bar Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-slate-900 transition-all duration-500 ease-out" 
            style={{ width: `${((currentStepIndex + 1) / evalData.steps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
          Étape {currentStepIndex + 1} / {evalData.steps.length}
        </span>
      </div>
      
      {renderStepContent()}
    </div>
  );
};

const WaitingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4 animate-fade-in">
    <div className="bg-yellow-50 p-8 rounded-full mb-8 animate-pulse">
      <Users size={64} className="text-yellow-500" />
    </div>
    <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">SALLE D'ATTENTE</h1>
    <p className="text-lg text-slate-600 max-w-lg mx-auto">
      Le formateur n'a pas encore lancé de session active. Veuillez patienter, l'affichage se mettra à jour automatiquement.
    </p>
  </div>
);

// --- APP ROOT ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeEvalId, setActiveEvalId] = useState<string | null>(null);
  const [activeEvalData, setActiveEvalData] = useState<Evaluation | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");

  // Auth Init
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Listen to Global Config
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, GLOBAL_CONFIG_DOC_PATH), (doc) => {
      if (doc.exists()) setActiveEvalId(doc.data().activeEvaluationId);
      else setActiveEvalId(null);
    }, (error) => console.error("Error watching config:", error));
    return () => unsub();
  }, [user]);

  // Fetch Active Eval Data
  useEffect(() => {
    if (activeEvalId) {
      getDoc(doc(db, EVALUATIONS_COLLECTION, activeEvalId)).then(snap => {
        if (snap.exists()) setActiveEvalData({ id: snap.id, ...snap.data() } as Evaluation);
      }).catch(err => console.error("Error fetching active eval:", err));
    } else {
      setActiveEvalData(null);
    }
  }, [activeEvalId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "power") {
      setIsAdmin(true);
      setShowLogin(false);
    } else {
      alert("Erreur mot de passe");
    }
  };

  if (!user) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Chargement...</div>;

  if (isAdmin) {
    return (
      <>
        <AdminDashboard />
        <button onClick={() => setIsAdmin(false)} className="fixed bottom-4 left-4 p-2 bg-slate-800 text-white rounded-full opacity-50 hover:opacity-100 z-50">
          <LogOut size={16} />
        </button>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      {/* Header User */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-black tracking-tighter text-xl">
            <div className="bg-yellow-400 w-8 h-8 flex items-center justify-center rounded text-slate-900">
              <Activity size={20} />
            </div>
            SÉCURITÉ<span className="text-yellow-600">BTP</span>
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Formation Interactive</div>
        </div>
      </header>

      <main>
        {activeEvalData ? (
          <UserPlayer evalData={activeEvalData} user={user} />
        ) : (
          <WaitingScreen />
        )}
      </main>

      {/* Admin Trigger */}
      <footer className="py-8 text-center">
        <button onClick={() => setShowLogin(true)} className="text-slate-300 hover:text-slate-400 transition-colors">
          <Lock size={16} />
        </button>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-center">Accès Formateur</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input 
                type="password" 
                autoFocus
                placeholder="Mot de passe"
                className="w-full p-3 border-2 border-slate-200 rounded-xl text-center text-lg focus:border-yellow-400 outline-none transition-colors"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowLogin(false)} className="py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Annuler</button>
                <button type="submit" className="py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg">Entrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}