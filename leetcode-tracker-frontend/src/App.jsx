import { useState, useEffect, useCallback, useRef } from 'react'
import api from './api'
import LoginSignupForm from './components/LoginSignupForm'
import LogoutButton from './components/LogoutButton'
import TabNav from './components/TabNav'
import Filters from './components/Filters'
import PopulateButton from './components/PopulateButton'
import QuestionList from './components/QuestionList'
import SolveModal from './components/SolveModal'
import ChatModal from './components/ChatModal'
import RandomQuestionCard from './components/RandomQuestion'
import Homepage from './components/Homepage'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { FaTimes} from 'react-icons/fa'


function SearchBar({ value, onChange }) {
  return (
    <input
      type="text"
      placeholder="Search companies..."
      className="w-full px-3 py-2 mb-4 rounded-md bg-zinc-800 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function CompaniesList({ companies, selected, onSelect, favorites, onToggleFav }) {
  return (
    <ul className="space-y-1 overflow-y-auto h-[calc(100vh-150px)] pr-1">
      {companies.map(c => (
        <li key={c.id} className="group flex items-center justify-between px-2 py-1 rounded-md hover:bg-zinc-800 transition-all cursor-pointer">
          <button
            className={`flex-1 text-left truncate text-sm font-medium transition-colors duration-150 ${
              selected?.id === c.id ? 'text-blue-400 font-semibold' : 'text-gray-300 group-hover:text-white'
            }`}
            onClick={() => onSelect(c)}
          >
            {c.name}
          </button>
          <button
            onClick={() => onToggleFav(c.id)}
            className="text-yellow-400 text-sm hover:scale-110 transform transition-transform"
            aria-label="Toggle favorite"
          >
            {favorites.includes(c.id) ? '★' : '☆'}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [companies, setCompanies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favs')||'[]'))
  const [company, setCompany] = useState(null)
  const [activeTab, setActiveTab] = useState('30_days')
  const [filters, setFilters] = useState({ difficulty: [], topics: [] })
  const [questions, setQuestions] = useState([])
  const [randomQ, setRandomQ] = useState(null)
  const [modal, setModal] = useState(null)
  const [chatQ, setChatQ] = useState(null)
  const [topics, setTopics] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [allQuestions, setAllQuestions] = useState([])
  const [updateMonths, setUpdateMonths]   = useState([])    
  const [activeMonth, setActiveMonth]     = useState(null) 

  const PING_INTERVAL = 25 * 60 * 1000;
  const PING_TIMEOUT = 15 * 1000;
  const PING_THRESHOLD = 500; 

  // refs so we can skip re-renders
  const lastPingTime = useRef(0);
  const pinging = useRef(false);

  const pingBackend = useCallback(() => {
    if (pinging.current) return;

    const now = Date.now();
    if (now - lastPingTime.current < PING_INTERVAL) return;

    pinging.current = true;
    let toastId;
    let timeoutId;
    let thresholdId;
    let gaveUp = false;

    const showLoading = () => {
      toastId = toast.loading(
        <div className="flex items-center">
          <span>
            Waking up backend   
            <span className="animate-pulse text-blue-400"> ...</span>
            <br />
            <span className="text-sm text-gray-400">This may take a few seconds.</span>
          </span>
        </div>,
        { style: { background: "#18181b", color: "#fff", fontSize: "1rem", minWidth: "260px" } }
      );
      // After PING_TIMEOUT, show error and stop retrying
      timeoutId = setTimeout(() => {
        gaveUp = true;
        if (toastId) {
          toast.dismiss(toastId);
        }
        toast.error(
          <div className="flex items-center gap-2">
            <span>
              Backend is taking longer than expected. <br/> Thank you for your patience.<br />
              <span className="text-sm text-gray-400">Please try again later.</span>
            </span>
          </div>,
          { style: { background: "#18181b", color: "#fff", fontSize: "1rem", minWidth: "260px" } }
        );
        pinging.current = false;
      }, PING_TIMEOUT);
    };

    const tryPing = () => {
      if (gaveUp) return;
      api.get('/ping')
        .then(() => {
          clearTimeout(thresholdId);
          if (timeoutId) clearTimeout(timeoutId);
          if (toastId) {
            toast.dismiss(toastId);
            toast.success(
              <div className="flex items-center gap-2">
                <span>
                  Backend is awake! 
                  <br />
                  <span className="text-sm text-gray-400">You can now use the app. Sorry for the wait.</span>
                </span>
              </div>,
              { style: { background: "#18181b", color: "#fff", fontSize: "1rem", minWidth: "220px" } }
            );
          }
          lastPingTime.current = Date.now();
          pinging.current = false;
        })
        .catch(() => {
          if (!gaveUp) {
            setTimeout(tryPing, 750);
          }
        });
    };

    thresholdId = setTimeout(showLoading, PING_THRESHOLD);
    tryPing();
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        pingBackend();
      }
    };
    ['mousemove','mousedown','touchstart','visibilitychange']
      .forEach(e => window.addEventListener(e, handler));
    return () => {
      ['mousemove','mousedown','touchstart','visibilitychange']
        .forEach(e => window.removeEventListener(e, handler));
    };
  }, [pingBackend]);

  // useEffect(() => {
  //   if (!company) return;
  //   api.get(`/companies/${company.id}/topics.json`)
  //     .then(r => setTopics(r.data))
  //     .catch(() => setTopics([]));
  // }, [company]);

  useEffect(() => {
    // Try to get user from localStorage first
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse stored user');
      }
    }
  
    // Still try to fetch from API
    api.get('/users/current.json')
      .then(r => {
        setUser(r.data);
        localStorage.setItem('currentUser', JSON.stringify(r.data));
      })
      .catch(() => {
        // Only clear if we don't already have a user
        if (!savedUser) {
          setUser(null);
          localStorage.removeItem('currentUser');
        }
      });
    
    api.get('/companies.json').then(r => setCompanies(r.data));
  }, []);

  const shownCompanies = (() => {
    const filtered = companies.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const favs = filtered.filter(c => favorites.includes(c.id))
    const rest = filtered
      .filter(c => !favorites.includes(c.id))
      .sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    return [...favs, ...rest]
  })()

  const toggleFav = id => {
    const next = favorites.includes(id)
      ? favorites.filter(x=>x!==id)
      : [...favorites, id]
    setFavorites(next)
    localStorage.setItem('favs', JSON.stringify(next))
  }

    // Create a single source of truth for fetching
  const fetchQuestionsRef = useRef(null);

  const fetchQuestions = useCallback(() => {
    if (!company) return;
    const toastId = toast.loading('Loading questions...', {
      style: { background: '#18181b', color: '#fff', fontSize: '1rem', minWidth: '220px' },
    });
    api.get(`/companies/${company.id}/questions.json`, {
      params: {
        timeframe: activeTab,
        difficulty: filters.difficulty.join(','),
        topics:     filters.topics.join(','),
        user_id:    user?.id
      }
    })
    .then(r => {
      const data = r.data;
      setAllQuestions(data);
      // extract unique “MMM yy” labels, newest-first
      const months = Array.from(
        new Set(
          data
            .map(q => format(new Date(q.updated_at), 'MMM yy'))
            .sort((a,b) => {
              return new Date(b) - new Date(a)
            })
        )
      );
      setUpdateMonths(months);
      setActiveMonth(prev => prev || months[0]);
      toast.dismiss(toastId);
    })
    .catch(() => {
      setAllQuestions([]);
      toast.dismiss(toastId);
      toast.error('Failed to load questions.', {
        style: { background: '#fee2e2', color: '#991b1b', fontWeight: 'bold' },
      });
    });
  }, [company?.id, activeTab, filters.difficulty, filters.topics, user?.id]);

  useEffect(() => {
    if (!activeMonth) return
    const filtered = allQuestions
      .filter(q => format(new Date(q.updated_at), 'MMM yy') === activeMonth)
      .sort((a,b) => b.frequency - a.frequency) 
    setQuestions(filtered)
  }, [allQuestions, activeMonth])

  useEffect(() => {
    if (!company) return
    const timer = setTimeout(fetchQuestions, 300)
    return () => clearTimeout(timer)
  }, [company, activeTab, fetchQuestions])


  const handleSelectCompany = useCallback((c) => {
    setCompany(c)
    setActiveTab('30_days')
    setSidebarOpen(false)
    setActiveMonth(null)
    setAllQuestions([])
  }, [])


  const getRandom = () => {
    if (!company) return
    api.get(`/companies/${company.id}/questions/random.json`, {
      params: {
        timeframe: activeTab,
        difficulty: filters.difficulty.join(','),
        topics: filters.topics.join(','),
        user_id: user?.id,
        update: activeMonth ? activeMonth : null,
      }
    })
    .then(r => setRandomQ(r.data))
    .catch(() => setRandomQ(null))
  }

  const startSolve = q => {
    if (!user) return setShowAuth(true)
    window.open(q.link, '_blank')
    setModal({ question: q, shown: false })
  }

  const finishSolve = async solved => {
    const { question } = modal
    if (solved) {
      await api.post(`/questions/${question.id}/solve.json?user_id=${user.id}`)
    }
    setQuestions(qs =>
      qs.map(x => x.id === question.id ? { ...x, solved } : x)
    )
    if (randomQ?.id === question.id) {
      setRandomQ(r => r ? { ...r, solved } : null)
    }
    setModal(null)
  }

  const unSolveRandom = async () => {
    if (!randomQ) return
    await api.delete(`/questions/${randomQ.id}/solve.json`)
    setRandomQ(r => r ? { ...r, solved: false } : null)
  }

  const resetProgress = async () => {
    if (!user) return setShowAuth(true)
    if (!confirm('Reset all progress for this company?')) return
    await api.post('/users/reset_progress.json', { company_id: company.id, user_id: user.id })
    toast.success('Progress reset! Fetching questions...', {
      style: {
        background: '#fde68a',
        color: '#92400e',
        fontWeight: 'bold',
      },
      iconTheme: {
        primary: '#f59e42',
        secondary: '#fff',
      },
    })
    fetchQuestions()
  }

  const closeChat = () => {
    setChatQ(null)
  }

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-black text-white">
      <aside className={`sm:w-72 w-full sm:block ${sidebarOpen ? 'block' : 'hidden'} sm:border-r border-gray-700 bg-gray-950 p-4 transition-all duration-300 z-40 sm:z-auto`}> 
        <div className="flex items-center justify-between mb-4 sm:hidden">
          <h2 className="text-xl font-bold pl-14">Companies</h2>
          <button
            className="text-sm text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <FaTimes className="text-2xl" />
          </button>
        </div>

        <div className="mb-4">
          {user ? (
            <div className="flex flex-col gap-2">
              <span className="font-medium text-sm">👤 {user.email.split('@')[0]}</span>
              <LogoutButton onLogout={() => {
                api.delete('/users/sign_out.json')
                setUser(null)
                }} />
              </div>
              ) : (
              <button
                className
              onClick={() => setShowAuth(true)}
            >Login / Sign Up</button>
          )}
        </div>

        <SearchBar value={searchTerm} onChange={setSearchTerm} />
        <CompaniesList
          companies={shownCompanies}
          selected={company}
          onSelect={handleSelectCompany}
          favorites={favorites}
          onToggleFav={toggleFav}
        />
      </aside>

      <main className="flex-1 overflow-hidden relative">
        <div className='h-full p-6 overflow-y-auto'>
          <button
            className="sm:hidden fixed top-4 left-4 z-50 bg-gray-800 text-white px-3 py-1 rounded shadow"
            onClick={() => setSidebarOpen(true)}
          >☰</button>

          {!company ? (
            <Homepage />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold ml-10 sm:ml-0">{company.name}</h1>
                <PopulateButton companyId={company.id} onRefresh={fetchQuestions} />
              </div>

              <TabNav active={activeTab} onChange={setActiveTab} />

              <Filters
                filters={filters}
                setFilters={setFilters}
                onFetch={() => {}}
                onRandom={getRandom}
                topics={topics}
              />
    
              
              {updateMonths.length > 0 && (
                <div className="w-full flex flex-wrap items-center justify-center gap-3 mb-4 ">
                  <div className="flex gap-2">
                    <span className="text-sm text-gray-400 px-4 py-1.5">Last Updated:</span>
                    {updateMonths.map(month => (
                      <button
                        key={month}
                        onClick={() => setActiveMonth(month)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition
                          ${
                            activeMonth === month
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                          }`}
                      >
                        {month === updateMonths[0] ? 'Latest' : month}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {randomQ  && (
                <RandomQuestionCard
                  question={randomQ}
                  onSolve={startSolve}
                  onUnsolve={unSolveRandom}
                  onChat={q => setChatQ(q)}
                  onClose={() => setRandomQ(null)}
                />
              )}

              {user && (
                <div className="flex items-center justify-between mb-2 text-sm">
                  <button
                    className="underline text-red-500 hover:text-red-400"
                    onClick={resetProgress}
                  >
                    Reset Progress
                  </button>
                  {questions.length !== 0 && (
                    <div className="text-right text-gray-400">
                      Solved <span className="font-semibold text-green-400">{questions.filter(q => q.solved).length}</span> out of <span className="font-semibold text-blue-400">{questions.length}</span> questions.
                    </div>
                  )}
                  
                </div>
              )}

              <QuestionList
                questions={questions}
                onSolve={startSolve}
                onUnsolve={id => {
                  api.delete(`/questions/${id}/solve.json?user_id=${user.id}`)
                  setQuestions(qs =>
                    qs.map(q => q.id === id ? { ...q, solved: false } : q)
                  )
                }}
                onChat={q => setChatQ(q)}
              />
            
            </>
          )}
        </div>
      </main>

      <SolveModal
        open={!!modal && !modal.shown}
        question={modal?.question}
        onClose={finishSolve}
      />

      <ChatModal
        open={!!chatQ}
        question={chatQ}
        onClose={closeChat}
      />

      {showAuth && (
        <LoginSignupForm
          onAuth={u => { setUser(u); setShowAuth(false) }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  )
}
