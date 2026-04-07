import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  signIn, 
  logOut, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  limit,
  getDocs,
  where,
  arrayUnion,
  arrayRemove,
  getDoc,
  serverTimestamp
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { GoogleGenAI, Type, Modality, LiveServerMessage, ThinkingLevel } from "@google/genai";
import { 
  Send, 
  LogOut, 
  ShieldCheck, 
  Info, 
  Zap, 
  User as UserIcon, 
  Bot, 
  AlertTriangle,
  Loader2,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  BarChart3,
  Table as TableIcon,
  TrendingUp,
  Settings,
  Brain,
  Heart,
  Eye,
  Activity,
  Trophy,
  Medal,
  Target,
  Calendar,
  LayoutDashboard,
  GraduationCap,
  Users,
  Bell,
  Search,
  Smile,
  Frown,
  Meh,
  Award,
  Star,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { AudioProcessor } from './lib/audio';

// --- Types ---
interface ChatSession {
  id: string;
  ownerId: string;
  participants: string[];
  title: string;
  createdAt: any;
  updatedAt: any;
}

interface Presence {
  uid: string;
  displayName: string;
  status: 'online' | 'offline';
  lastSeen: any;
}

interface ChatMessage {
  id?: string;
  uid: string;
  role: 'user' | 'assistant';
  content: string;
  explanation?: string;
  ethicalCheck?: string;
  confidence?: number;
  emotion?: string;
  biasCheck?: string;
  contextUsed?: string;
  chartData?: {
    type: 'bar' | 'line' | 'pie';
    data: any[];
    title: string;
  };
  comparisonData?: {
    title: string;
    headers: string[];
    rows: string[][];
  };
  timestamp: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role?: 'student' | 'teacher' | 'admin';
  career?: string;
  goals?: string;
  interests?: string;
  voiceEnabled?: boolean;
  preferredVoice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

interface GamificationStats {
  points: number;
  level: number;
  streak: number;
  badges: string[];
}

interface PerformanceMetric {
  id: string;
  subject: string;
  grade: number;
  progress: number;
  timestamp: any;
}

interface WellbeingLog {
  id: string;
  emotion: string;
  stressLevel: number;
  notes: string;
  timestamp: any;
}

interface QuizData {
  id: string;
  title: string;
  subject: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
  score?: number;
  maxScore?: number;
}

interface StudyPlan {
  id: string;
  tasks: {
    title: string;
    duration: string;
    completed: boolean;
  }[];
  timestamp: any;
}

// --- Gemini Config ---
const SYSTEM_INSTRUCTION = `You are TrustAI, a senior ethical AI architect and advanced Student Tutor.
You are part of an Adaptive Learning System designed to build trust, transparency, and responsible AI.

CORE PRINCIPLES:
1. CONTEXT-AWARENESS: Use the provided user profile (career, goals, interests) to personalize responses.
2. EXPLAINABILITY: Always explain "Why this answer" by showing your reasoning process.
3. ETHICAL AI: Detect and prevent bias. Ensure safe, fair, and inclusive responses.
4. EMOTION DETECTION: Detect the user's emotional state (e.g., stressed, confused, curious).
5. TRANSPARENCY: Explicitly state what context was used.
6. ADAPTIVE LEARNING: If the user is a student, provide tutoring, generate quizzes, and create study plans.

MANDATORY OUTPUT FORMAT (JSON):
{
  "answer": "The direct response to the user.",
  "explanation": "A detailed reasoning of why this answer was generated.",
  "ethicalCheck": "A statement on fairness, safety, and bias-free nature.",
  "biasCheck": "Specific detection of potential biases in the query or response.",
  "confidence": 0.95,
  "confidenceLevel": "High",
  "emotion": "Detected emotion (e.g., Stressed, Curious, Confused)",
  "contextUsed": "Description of user profile data or history used.",
  "chartData": { ... optional ... },
  "comparisonData": { ... optional ... },
  "quiz": { 
    "title": "Quiz Title",
    "subject": "Subject",
    "questions": [
      { "question": "...", "options": ["...", "..."], "correctAnswer": 0 }
    ]
  },
  "studyPlan": {
    "tasks": [
      { "title": "Task Name", "duration": "30m", "completed": false }
    ]
  }
}

If a query is harmful or unethical, use the ethicalCheck to explain why you cannot fulfill it.
Maintain a professional, supportive, and transparent persona.`;

const LIVE_SYSTEM_INSTRUCTION = `You are TrustAI Assistant, an ethical, explainable, and context-aware AI.
You are currently in a real-time voice conversation. 
Keep your responses concise and conversational, but maintain your ethical and explainable principles.
If the user asks for an explanation or ethical check, provide it clearly.
Always be helpful, safe, and transparent.`;

// --- Components ---
const ChartRenderer = ({ chartData }: { chartData: ChatMessage['chartData'] }) => {
  if (!chartData) return null;

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

  return (
    <div className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-6 my-4">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-bold text-white tracking-tight">{chartData.title}</h3>
      </div>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartData.type === 'bar' ? (
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                itemStyle={{ color: '#f1f5f9', fontSize: '12px' }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartData.type === 'line' ? (
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                itemStyle={{ color: '#f1f5f9', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData.data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                itemStyle={{ color: '#f1f5f9', fontSize: '12px' }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ComparisonRenderer = ({ comparisonData }: { comparisonData: ChatMessage['comparisonData'] }) => {
  if (!comparisonData) return null;

  return (
    <div className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-6 my-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <TableIcon className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-bold text-white tracking-tight">{comparisonData.title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800">
              {comparisonData.headers.map((header, i) => (
                <th key={i} className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {comparisonData.rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="py-3 px-4 text-xs text-slate-300">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const QuizRenderer = ({ quiz, onComplete }: { quiz: QuizData; onComplete: (score: number) => void }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleNext = () => {
    if (selectedOption === quiz.questions[currentQuestion].correctAnswer) {
      setScore(s => s + 1);
    }
    
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(q => q + 1);
      setSelectedOption(null);
    } else {
      setShowResult(true);
      onComplete(score + (selectedOption === quiz.questions[currentQuestion].correctAnswer ? 1 : 0));
    }
  };

  if (showResult) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
        <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Quiz Completed!</h3>
        <p className="text-slate-400 mb-6">You scored {score} out of {quiz.questions.length}</p>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-1000" 
            style={{ width: `${(score / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{quiz.subject}</span>
        <span className="text-xs text-slate-500">Question {currentQuestion + 1} of {quiz.questions.length}</span>
      </div>
      <h3 className="text-lg font-bold text-white mb-6">{quiz.questions[currentQuestion].question}</h3>
      <div className="space-y-3">
        {quiz.questions[currentQuestion].options.map((opt, i) => (
          <button
            key={i}
            onClick={() => setSelectedOption(i)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-xl text-sm transition-all border",
              selectedOption === i 
                ? "bg-indigo-600/20 border-indigo-500 text-white" 
                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        disabled={selectedOption === null}
        onClick={handleNext}
        className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
      >
        {currentQuestion === quiz.questions.length - 1 ? "Finish Quiz" : "Next Question"}
      </button>
    </div>
  );
};

const Dashboard = ({ 
  gamification, 
  performance, 
  wellbeing, 
  studyPlan 
}: { 
  gamification: GamificationStats; 
  performance: PerformanceMetric[]; 
  wellbeing: WellbeingLog[]; 
  studyPlan: StudyPlan | null;
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-6xl mx-auto w-full">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Points</span>
          </div>
          <div className="text-3xl font-bold text-white">{gamification.points}</div>
          <div className="text-[10px] text-slate-500 mt-1">Level {gamification.level} Student</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-500/10 rounded-xl">
              <Flame className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Streak</span>
          </div>
          <div className="text-3xl font-bold text-white">{gamification.streak} Days</div>
          <div className="text-[10px] text-slate-500 mt-1">Keep it up!</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Progress</span>
          </div>
          <div className="text-3xl font-bold text-white">84%</div>
          <div className="text-[10px] text-slate-400 mt-1">Overall Completion</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wellbeing</span>
          </div>
          <div className="text-3xl font-bold text-white">Stable</div>
          <div className="text-[10px] text-slate-500 mt-1">Last check: 2h ago</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Academic Performance</h3>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance.length > 0 ? performance : [
                { subject: 'Math', grade: 85, id: '1', progress: 0, timestamp: null },
                { subject: 'Science', grade: 92, id: '2', progress: 0, timestamp: null },
                { subject: 'History', grade: 78, id: '3', progress: 0, timestamp: null },
                { subject: 'English', grade: 88, id: '4', progress: 0, timestamp: null },
                { subject: 'AI Ethics', grade: 95, id: '5', progress: 0, timestamp: null }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="subject" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="grade" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Study Plan */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Smart Study Plan</h3>
          </div>
          <div className="space-y-4">
            {(studyPlan?.tasks || [
              { title: 'Review AI Ethics Paper', duration: '45m', completed: true },
              { title: 'Math Quiz - Calculus', duration: '30m', completed: false },
              { title: 'History Essay Draft', duration: '1h', completed: false },
              { title: 'Science Lab Report', duration: '40m', completed: false }
            ]).map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className={cn(
                  "p-1 rounded-md",
                  task.completed ? "bg-emerald-500/20 text-emerald-500" : "bg-slate-700 text-slate-500"
                )}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className={cn("text-sm font-medium", task.completed ? "text-slate-500 line-through" : "text-slate-200")}>
                    {task.title}
                  </div>
                  <div className="text-[10px] text-slate-500">{task.duration}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all border border-slate-700">
            Generate New Plan
          </button>
        </div>
      </div>

      {/* Badges & Achievements */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Badges & Achievements</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {['Fast Learner', 'Ethics Pro', 'Streak Master', 'Quiz King', 'Early Bird', 'Deep Thinker'].map((badge, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30 grayscale hover:grayscale-0 transition-all cursor-pointer">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-indigo-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 text-center">{badge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileModal = ({ 
  isOpen, 
  onClose, 
  profile, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  profile: UserProfile | null;
  onSave: (data: Partial<UserProfile>) => void;
}) => {
  const [formData, setFormData] = useState({
    career: profile?.career || '',
    goals: profile?.goals || '',
    interests: profile?.interests || '',
    voiceEnabled: profile?.voiceEnabled ?? true,
    preferredVoice: profile?.preferredVoice || 'Zephyr'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-bold text-white">Context & Voice Profile</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-2">Personal Context</h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Career / Background</label>
              <input 
                type="text" 
                value={formData.career}
                onChange={e => setFormData({...formData, career: e.target.value})}
                placeholder="e.g. Software Engineer, Student, Designer"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Goals</label>
              <textarea 
                value={formData.goals}
                onChange={e => setFormData({...formData, goals: e.target.value})}
                placeholder="What are you working on?"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Interests</label>
              <input 
                type="text" 
                value={formData.interests}
                onChange={e => setFormData({...formData, interests: e.target.value})}
                placeholder="e.g. AI, Space, Cooking"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-2">Voice Settings</h3>
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-sm font-bold text-white">Voice Mode</p>
                  <p className="text-[10px] text-slate-500">Enable real-time voice interaction</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({...formData, voiceEnabled: !formData.voiceEnabled})}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  formData.voiceEnabled ? "bg-indigo-600" : "bg-slate-700"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  formData.voiceEnabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Assistant Voice</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].map((voice) => (
                  <button
                    key={voice}
                    type="button"
                    onClick={() => setFormData({...formData, preferredVoice: voice as any})}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                      formData.preferredVoice === voice 
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" 
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    {voice}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
          >
            Save Profile & Settings
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const TransparencyReport = ({ isOpen, onClose, lastMessage }: { isOpen: boolean, onClose: () => void, lastMessage: ChatMessage | null }) => {
  if (!isOpen || !lastMessage) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-bold text-white">Transparency Report</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Context Utilized</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{lastMessage.contextUsed}</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Ethical Reasoning</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{lastMessage.ethicalCheck}</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Bias Mitigation</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{lastMessage.biasCheck}</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Confidence Score</span>
            <span className="text-lg font-mono font-bold text-white">{Math.round((lastMessage.confidence || 0) * 100)}%</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all"
        >
          Close Report
        </button>
      </motion.div>
    </div>
  );
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingStep, setTypingStep] = useState<string>('');
  const [sessionSearch, setSessionSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'admin'>('chat');
  const [gamification, setGamification] = useState<GamificationStats>({ points: 0, level: 1, streak: 0, badges: [] });
  const [performance, setPerformance] = useState<PerformanceMetric[]>([]);
  const [wellbeing, setWellbeing] = useState<WellbeingLog[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [isTransparencyModalOpen, setIsTransparencyModalOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const liveSessionRef = useRef<any>(null);

  // --- Auth & Data ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch User Profile
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile({ uid: user.uid, ...snapshot.data() } as UserProfile);
      } else {
        // Initialize profile if it doesn't exist
        const initialProfile = {
          uid: user.uid,
          displayName: user.displayName || 'User',
          email: user.email || '',
          role: 'student',
          career: '',
          goals: '',
          interests: ''
        };
        setDoc(doc(db, 'users', user.uid), initialProfile);
        // Sync to public profile
        setDoc(doc(db, 'users_public', user.uid), {
          uid: user.uid,
          displayName: initialProfile.displayName,
          email: initialProfile.email
        });
      }
    });
    return unsubscribe;
  }, [user]);

  // Fetch Gamification Stats
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'gamification', 'stats'), (snapshot) => {
      if (snapshot.exists()) {
        setGamification(snapshot.data() as GamificationStats);
      } else {
        const initialStats = { points: 100, level: 1, streak: 1, badges: ['Newcomer'] };
        setDoc(doc(db, 'users', user.uid, 'gamification', 'stats'), initialStats);
      }
    });
    return unsubscribe;
  }, [user]);

  // Fetch Performance Metrics
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'performance'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPerformance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceMetric)));
    });
    return unsubscribe;
  }, [user]);

  // Fetch Wellbeing Logs
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'wellbeing'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWellbeing(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WellbeingLog)));
    });
    return unsubscribe;
  }, [user]);

  // Fetch Study Plan
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'studyPlans'), orderBy('timestamp', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setStudyPlan({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as StudyPlan);
      }
    });
    return unsubscribe;
  }, [user]);

  // Fetch Sessions
  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    const q = query(
      collection(db, 'sessions'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sess = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession));
      // Sort client-side to avoid index requirements
      sess.sort((a, b) => {
        const tA = a.updatedAt?.toDate?.() || new Date(a.updatedAt);
        const tB = b.updatedAt?.toDate?.() || new Date(b.updatedAt);
        return tB.getTime() - tA.getTime();
      });
      setSessions(sess);
      
      // Auto-select first session if none selected
      if (sess.length > 0 && !currentSessionId) {
        setCurrentSessionId(sess[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    });

    return unsubscribe;
  }, [user]);

  // Fetch Messages for current session
  useEffect(() => {
    if (!user || !currentSessionId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'sessions', currentSessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          chartData: typeof data.chartData === 'string' ? JSON.parse(data.chartData) : data.chartData,
          comparisonData: typeof data.comparisonData === 'string' ? JSON.parse(data.comparisonData) : data.comparisonData
        } as ChatMessage;
      });
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `sessions/${currentSessionId}/messages`);
    });

    return unsubscribe;
  }, [user, currentSessionId]);

  // --- Presence Tracking ---
  const [activeParticipants, setActiveParticipants] = useState<Presence[]>([]);
  useEffect(() => {
    if (!user || !currentSessionId) {
      setActiveParticipants([]);
      return;
    }

    const presenceRef = doc(db, 'sessions', currentSessionId, 'presence', user.uid);
    
    const setOnline = async () => {
      try {
        await setDoc(presenceRef, {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          status: 'online',
          lastSeen: serverTimestamp()
        });
      } catch (e) {}
    };

    const setOffline = async () => {
      try {
        await setDoc(presenceRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        }, { merge: true });
      } catch (e) {}
    };

    setOnline();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setOffline();
      } else {
        setOnline();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', setOffline);

    // Fetch Presence
    const q = query(collection(db, 'sessions', currentSessionId, 'presence'), where('status', '==', 'online'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveParticipants(snapshot.docs.map(d => d.data() as Presence));
    });

    return () => {
      setOffline();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', setOffline);
      unsubscribe();
    };
  }, [user, currentSessionId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Filtering Logic ---
  const filteredSessions = sessions.filter(sess => {
    const matchesSearch = sess.title.toLowerCase().includes(sessionSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (dateFilter === 'all') return true;
    
    const now = new Date();
    const sessionDate = sess.createdAt instanceof Date ? sess.createdAt : (sess.createdAt as any)?.toDate?.() || new Date(sess.createdAt);
    
    if (dateFilter === 'today') {
      return sessionDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return sessionDate >= weekAgo;
    }
    return true;
  });

  const filteredMessages = messages.filter(msg => 
    msg.content.toLowerCase().includes(messageSearch.toLowerCase())
  );

  // --- Session Management ---
  const createNewChat = async () => {
    if (!user) return;
    
    const newSession = {
      ownerId: user.uid,
      participants: [user.uid],
      title: 'New Conversation',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'sessions'), newSession);
      setCurrentSessionId(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
      if (currentSessionId === sessionId) {
        const nextSession = sessions.find(s => s.id !== sessionId);
        setCurrentSessionId(nextSession ? nextSession.id : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${sessionId}`);
    }
  };

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const inviteUser = async (email: string) => {
    if (!user || !currentSessionId) return;
    setInviteStatus(null);
    try {
      // Search in users_public instead of users
      const q = query(collection(db, 'users_public'), where('email', '==', email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setInviteStatus({ type: 'error', message: "User not found." });
        return;
      }
      const targetUid = snapshot.docs[0].id;
      await setDoc(doc(db, 'sessions', currentSessionId), {
        participants: arrayUnion(targetUid),
        updatedAt: serverTimestamp()
      }, { merge: true });
      setInviteStatus({ type: 'success', message: `User ${email} invited!` });
      setInviteEmail('');
      setTimeout(() => {
        setInviteStatus(null);
        setIsInviteOpen(false);
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sessions/${currentSessionId}`);
      setInviteStatus({ type: 'error', message: "Failed to invite user. Check permissions." });
    }
  };

  const handleSaveProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      if (data.displayName || data.email) {
        await setDoc(doc(db, 'users_public', user.uid), {
          uid: user.uid,
          ...(data.displayName && { displayName: data.displayName }),
          ...(data.email && { email: data.email })
        }, { merge: true });
      }
    } catch (error) {
      console.error("Save profile error:", error);
    }
  };

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
  };

  const handleQuizComplete = async (score: number) => {
    if (!user || !activeQuiz) return;
    try {
      // Update points
      await setDoc(doc(db, 'users', user.uid, 'gamification', 'stats'), {
        points: gamification.points + (score * 10)
      }, { merge: true });

      // Save performance
      await addDoc(collection(db, 'users', user.uid, 'performance'), {
        subject: activeQuiz.subject,
        grade: (score / activeQuiz.questions.length) * 100,
        timestamp: new Date()
      });

      setActiveQuiz(null);
    } catch (error) {
      console.error("Quiz completion error:", error);
    }
  };

  // --- Voice Mode Logic ---
  const startVoiceMode = async () => {
    if (!user) return;
    if (userProfile?.voiceEnabled === false) {
      alert("Voice mode is disabled in settings.");
      return;
    }
    setIsVoiceMode(true);
    setIsLiveActive(true);
    setLiveTranscription('Connecting to TrustAI Voice...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setLiveTranscription('TrustAI is listening...');
            audioProcessorRef.current = new AudioProcessor((base64Data) => {
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            });
            audioProcessorRef.current.start();
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              await AudioProcessor.playPCM(base64Audio, 24000);
            }

            const userTranscript = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (userTranscript) {
              setLiveTranscription(userTranscript);
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            stopVoiceMode();
          },
          onclose: () => {
            stopVoiceMode();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: userProfile?.preferredVoice || "Zephyr" } },
          },
          systemInstruction: LIVE_SYSTEM_INSTRUCTION,
        },
      });

      liveSessionRef.current = await sessionPromise;
    } catch (error) {
      console.error("Failed to start voice mode:", error);
      stopVoiceMode();
    }
  };

  const stopVoiceMode = () => {
    if (!isVoiceMode) return;
    
    setIsVoiceMode(false);
    setIsLiveActive(false);
    setLiveTranscription('');
    
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }
    
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
  };

  // --- Chat Logic ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isTyping) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      // Create a session if none exists
      const newSession = {
        ownerId: user.uid,
        participants: [user.uid],
        title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      try {
        const docRef = await addDoc(collection(db, 'sessions'), newSession);
        sessionId = docRef.id;
        setCurrentSessionId(sessionId);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'sessions');
        return;
      }
    }

    const userMessage: ChatMessage = {
      uid: user.uid,
      role: 'user',
      content: input,
      timestamp: serverTimestamp()
    };

    setInput('');
    setIsTyping(true);
    setTypingStep('Analyzing Context...');

    try {
      // Save user message
      await addDoc(collection(db, 'sessions', sessionId, 'messages'), userMessage);
      
      // Update session timestamp
      await setDoc(doc(db, 'sessions', sessionId), {
        updatedAt: serverTimestamp()
      }, { merge: true });

      setTypingStep('Performing Ethical Check...');
      setTimeout(() => setTypingStep('Detecting Bias & Emotion...'), 1500);
      setTimeout(() => setTypingStep('Generating Explainable Answer...'), 3000);

      // Call Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const contextPrompt = userProfile 
        ? `USER CONTEXT: Career: ${userProfile.career}, Goals: ${userProfile.goals}, Interests: ${userProfile.interests}. `
        : "No prior user context provided. ";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.slice(-5).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: contextPrompt + input }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              ethicalCheck: { type: Type.STRING },
              biasCheck: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              confidenceLevel: { type: Type.STRING },
              emotion: { type: Type.STRING },
              contextUsed: { type: Type.STRING },
              chartData: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["bar", "line", "pie"] },
                  data: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        value: { type: Type.NUMBER }
                      },
                      required: ["name", "value"]
                    }
                  },
                  title: { type: Type.STRING }
                },
                required: ["type", "data", "title"]
              },
              comparisonData: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rows: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                },
                required: ["title", "headers", "rows"]
              }
            },
            required: ["answer", "explanation", "ethicalCheck", "biasCheck", "confidence", "confidenceLevel", "emotion", "contextUsed"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');

      // Handle Quiz
      if (result.quiz) {
        setActiveQuiz({ id: Date.now().toString(), ...result.quiz });
      }

      // Handle Study Plan
      if (result.studyPlan) {
        await addDoc(collection(db, 'users', user.uid, 'studyPlans'), {
          ...result.studyPlan,
          timestamp: new Date()
        });
      }

      // Save AI response
      await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
        uid: user.uid,
        role: 'assistant',
        content: result.answer,
        explanation: result.explanation,
        ethicalCheck: result.ethicalCheck,
        biasCheck: result.biasCheck,
        confidence: result.confidence,
        confidenceLevel: result.confidenceLevel,
        emotion: result.emotion,
        contextUsed: result.contextUsed,
        chartData: result.chartData ? JSON.stringify(result.chartData) : null,
        comparisonData: result.comparisonData ? JSON.stringify(result.comparisonData) : null,
        timestamp: serverTimestamp()
      });

      // Award points for interaction
      await setDoc(doc(db, 'users', user.uid, 'gamification', 'stats'), {
        points: gamification.points + 5
      }, { merge: true });

    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">TrustAI Assistant</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Experience ethical, explainable, and transparent AI conversations.
          </p>
          <button 
            onClick={signIn}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-slate-950 flex text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-72 border-r border-slate-800 bg-slate-900/50 flex flex-col h-full z-40"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                <span className="font-bold text-white">TrustAI</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors"
                  title="Context Profile"
                >
                  <Brain className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <button 
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                  activeTab === 'chat' ? "bg-indigo-600 text-white" : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
                )}
              >
                <Bot className="w-4 h-4" />
                Chat Tutor
              </button>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                  activeTab === 'dashboard' ? "bg-indigo-600 text-white" : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Student Dashboard
              </button>
              {userProfile?.role === 'admin' && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                    activeTab === 'admin' ? "bg-indigo-600 text-white" : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Teacher Panel
                </button>
              )}
            </div>

            <div className="p-4 space-y-3">
              <button 
                onClick={createNewChat}
                className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-sm font-medium"
              >
                <Zap className="w-4 h-4" />
                New Conversation
              </button>

              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="Search sessions..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'today', 'week'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={cn(
                        "flex-1 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all",
                        dateFilter === filter ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                <span>Recent Chats</span>
                <span className="text-[9px] opacity-50">{filteredSessions.length} sessions</span>
              </div>
              {filteredSessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => setCurrentSessionId(sess.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setCurrentSessionId(sess.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-xl text-sm transition-all flex items-center justify-between group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    currentSessionId === sess.id 
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Bot className={cn("w-4 h-4 flex-shrink-0", currentSessionId === sess.id ? "text-indigo-400" : "text-slate-600")} />
                    <span className="truncate">{sess.title}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteSession(e, sess.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded-md transition-all text-slate-500 hover:text-rose-400"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-6">
                Hackathon Demo Scenarios
              </div>
              <div className="space-y-1">
                <button 
                  onClick={() => setInput("Based on my career, suggest a specialization.")}
                  className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-slate-400 hover:bg-slate-800/50 hover:text-indigo-400 transition-all flex items-center gap-2"
                >
                  <Brain className="w-3 h-3" />
                  Context Suggestion
                </button>
                <button 
                  onClick={() => setInput("Explain why you recommended that.")}
                  className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-slate-400 hover:bg-slate-800/50 hover:text-indigo-400 transition-all flex items-center gap-2"
                >
                  <Info className="w-3 h-3" />
                  Explainability Demo
                </button>
                <button 
                  onClick={() => setInput("Is there any gender bias in tech hiring?")}
                  className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-slate-400 hover:bg-slate-800/50 hover:text-indigo-400 transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Bias Detection Demo
                </button>
                <button 
                  onClick={() => setInput("I'm feeling really stressed about my studies.")}
                  className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-slate-400 hover:bg-slate-800/50 hover:text-indigo-400 transition-all flex items-center gap-2"
                >
                  <Heart className="w-3 h-3" />
                  Emotional Support Demo
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-400">
                  {user.displayName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={logOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        profile={userProfile}
        onSave={handleSaveProfile}
      />

      <TransparencyReport 
        isOpen={isTransparencyModalOpen}
        onClose={() => setIsTransparencyModalOpen(false)}
        lastMessage={messages.length > 0 ? messages[messages.length - 1] : null}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                <ShieldCheck className="w-6 h-6 text-indigo-500" />
              </button>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white">
                {activeTab === 'chat' ? (currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title : "TrustAI Assistant") : activeTab === 'dashboard' ? 'Student Dashboard' : 'Teacher Panel'}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Ethical • Explainable • Adaptive</span>
            </div>
            {activeTab === 'chat' && currentSessionId && (
              <div className="flex items-center gap-2 ml-4 border-l border-slate-800 pl-4 relative">
                <div className="flex -space-x-2 overflow-hidden">
                  {activeParticipants.map((p) => (
                    <div 
                      key={p.uid} 
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-950 bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase"
                      title={`${p.displayName} (Online)`}
                    >
                      {p.displayName.charAt(0)}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setIsInviteOpen(!isInviteOpen)}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition-all"
                  title="Invite User"
                >
                  <Users className="w-3.5 h-3.5" />
                </button>

                {isInviteOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl z-50">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Invite Participant</h3>
                    <div className="space-y-3">
                      <input 
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button 
                        onClick={() => inviteUser(inviteEmail)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        Send Invite
                      </button>
                      {inviteStatus && (
                        <p className={cn(
                          "text-[10px] font-medium text-center",
                          inviteStatus.type === 'success' ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {inviteStatus.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="Search messages..."
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-full pl-9 pr-4 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-48"
              />
            </div>

            <div className="hidden sm:flex items-center gap-4 px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-white">{gamification.points}</span>
              </div>
              <div className="w-px h-3 bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-xs font-bold text-white">{gamification.streak}</span>
              </div>
            </div>

            <button 
              onClick={toggleCamera}
              className={cn(
                "p-2 rounded-xl transition-all",
                isCameraActive ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
              )}
              title="Face Emotion Detection"
            >
              <Activity className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => setIsTransparencyModalOpen(true)}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-indigo-400 transition-all"
              title="Transparency Report"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button 
              onClick={startVoiceMode}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-indigo-400 transition-all"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={logOut}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-rose-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Voice Mode Overlay */}
        <AnimatePresence>
          {isVoiceMode && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
            >
              <button 
                onClick={stopVoiceMode}
                className="absolute top-6 right-6 p-3 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative mb-12">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl"
                />
                <div className="relative w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/50">
                  <Mic className="w-12 h-12 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">Voice Conversation</h2>
              <p className="text-slate-400 text-center max-w-md mb-8 leading-relaxed">
                {liveTranscription || "TrustAI is listening..."}
              </p>

              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-sm font-medium">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Live Connection Active
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'chat' ? (
          <>
            {/* Camera Preview */}
            {isCameraActive && (
              <div className="absolute top-20 right-6 z-50 w-48 h-36 bg-slate-900 border-2 border-indigo-500 rounded-2xl overflow-hidden shadow-2xl">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-indigo-600 text-[8px] font-bold text-white rounded uppercase tracking-widest">
                  Emotion: Analyzing...
                </div>
              </div>
            )}

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
              {activeQuiz && (
                <div className="mb-8">
                  <QuizRenderer quiz={activeQuiz} onComplete={handleQuizComplete} />
                </div>
              )}
              
              {messages.length === 0 && !isTyping && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                <Bot className="w-10 h-10 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">How can I help you today?</h2>
              <p className="text-slate-400 max-w-sm">
                Ask me anything. I'll provide explainable answers with an ethical perspective.
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {filteredMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                  msg.role === 'user' ? "bg-slate-800" : "bg-indigo-600"
                )}>
                  {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={cn(
                  "flex flex-col gap-2 max-w-[85%]",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-slate-800 text-slate-100 rounded-tr-none" 
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
                  )}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.role === 'assistant' && (
                      <>
                        <ChartRenderer chartData={msg.chartData} />
                        <ComparisonRenderer comparisonData={msg.comparisonData} />
                      </>
                    )}
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full mt-2">
                      {/* Explainability */}
                      <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                          <Info className="w-3.5 h-3.5" />
                          Why this answer
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {msg.explanation}
                        </p>
                      </div>

                      {/* Ethical Check */}
                      <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-400 uppercase tracking-widest">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Ethical Check
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {msg.ethicalCheck}
                        </p>
                        {msg.biasCheck && (
                          <div className="mt-2 pt-2 border-t border-slate-800/50">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">
                              <Activity className="w-3 h-3" />
                              Bias Detection
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight italic">
                              {msg.biasCheck}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Emotion & Context */}
                      <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                            <Zap className="w-3.5 h-3.5" />
                            Trust Metrics
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                            {Math.round((msg.confidence || 0) * 100)}%
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                              <Heart className="w-3 h-3 text-rose-400" /> Emotion
                            </span>
                            <span className="text-slate-300 font-medium">{msg.emotion}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                              <Eye className="w-3 h-3 text-indigo-400" /> Context
                            </span>
                            <span className="text-slate-300 font-medium truncate max-w-[100px]">{msg.contextUsed}</span>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-1000" 
                            style={{ width: `${(msg.confidence || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex-shrink-0 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl rounded-tl-none">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                    <span className="text-sm text-slate-400 font-medium animate-pulse">{typingStep}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </main>
        </>
        ) : activeTab === 'dashboard' ? (
          <Dashboard 
            gamification={gamification}
            performance={performance}
            wellbeing={wellbeing}
            studyPlan={studyPlan}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Teacher Administration</h2>
            <p className="text-slate-400 max-w-md">
              The Teacher Panel allows educators to monitor student wellbeing, performance trends, and manage ethical AI constraints.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="text-indigo-400 font-bold mb-1">124</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Active Students</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="text-emerald-400 font-bold mb-1">92%</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Avg. Wellbeing</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="text-amber-400 font-bold mb-1">12</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Alerts Today</div>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        {activeTab === 'chat' && (
          <footer className="p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md relative">
            {isLiveActive && liveTranscription && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-12 right-4 max-w-[250px] bg-indigo-600/90 backdrop-blur-md text-white text-[10px] px-3 py-2 rounded-xl shadow-xl border border-indigo-500/50 flex items-center gap-2 z-40"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="truncate italic">"{liveTranscription}"</span>
              </motion.div>
            )}
            <form 
              onSubmit={handleSendMessage}
              className="max-w-4xl mx-auto relative flex items-center gap-2"
            >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask TrustAI something..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-600 mt-3 uppercase tracking-widest font-medium">
            Powered by Gemini AI • Ethical & Explainable
          </p>
        </footer>
        )}
      </div>
    </div>
  );
}
