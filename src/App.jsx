import { useState, useEffect, useRef, useCallback } from 'react';
import {
    BookOpen, Zap, FileText, MessageCircle, Copy, Check, X,
    ChevronDown, Send, Sparkles, Star, GraduationCap, Brain,
    Lightbulb, Award, Menu, ArrowRight, RotateCcw, Download
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ─── Constants ───────────────────────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_SETUP_MESSAGE = 'Missing VITE_GROQ_API_KEY. Add it to `.env` for local development, or set it in your Vercel project Environment Variables and redeploy.';

const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
    'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

const COURSES = {
    'BCA': ['Computer Fundamentals', 'C Programming', 'Data Structures', 'DBMS',
        'Operating Systems', 'Web Technologies', 'Java Programming', 'Software Engineering',
        'Computer Networks', 'Python Programming'],
    'BSc CS': ['Programming in C', 'Digital Electronics', 'Data Structures',
        'Object Oriented Programming', 'Database Management', 'Computer Graphics',
        'Compiler Design', 'Artificial Intelligence', 'Information Security'],
    'BCom': ['Financial Accounting', 'Business Economics', 'Corporate Accounting',
        'Income Tax', 'Statistics', 'Business Laws', 'Cost Accounting', 'Auditing',
        'Financial Management', 'Marketing Management'],
    'BBA': ['Principles of Management', 'Business Economics', 'Financial Accounting',
        'Business Statistics', 'Marketing Management', 'Human Resource Management',
        'Business Laws', 'Entrepreneurship Development', 'Operations Management',
        'Business Communication', 'Organizational Behaviour', 'International Business'],
    'BA': ['Communicative English', 'History of Kerala', 'Political Science',
        'Economics', 'Sociology', 'Psychology', 'Philosophy', 'Malayalam Literature'],
    'BTech': ['Engineering Mathematics', 'Engineering Physics', 'Engineering Chemistry',
        'Data Structures & Algorithms', 'Digital Systems', 'Signals & Systems',
        'Control Systems', 'VLSI Design', 'Machine Learning'],
    'BSc Maths': ['Calculus', 'Linear Algebra', 'Real Analysis', 'Abstract Algebra',
        'Number Theory', 'Complex Analysis', 'Differential Equations', 'Topology'],
    'BSc Physics': ['Mechanics', 'Thermodynamics', 'Optics', 'Electromagnetism',
        'Quantum Mechanics', 'Nuclear Physics', 'Solid State Physics'],
    'MBA': ['Management Principles', 'Marketing Management', 'Financial Management',
        'Human Resource Management', 'Operations Management', 'Business Analytics'],
};

const MARK_TABS = [
    {
        id: '2',
        label: '2 Marks',
        sublabel: 'Quick Hit',
        emoji: '⚡',
        bg: 'bg-[#fff4e4]',
        activeBg: 'bg-[#d89b2b]',
        border: 'border-[#e7c57d]',
        activeBorder: 'border-[#b27912]',
        text: 'text-[#9a6405]',
        activeText: 'text-white',
        badgeBg: 'bg-[#d89b2b]',
        badgeText: 'text-white',
        description: 'Precise legal definition',
        gradientFrom: '#fff0d8',
        gradientTo: '#d89b2b',
    },
    {
        id: '5',
        label: '5 Marks',
        sublabel: 'Core Points',
        emoji: '📝',
        bg: 'bg-[#f7ece8]',
        activeBg: 'bg-[#c7512e]',
        border: 'border-[#e7b9aa]',
        activeBorder: 'border-[#9e371b]',
        text: 'text-[#9f3b1d]',
        activeText: 'text-white',
        badgeBg: 'bg-[#c7512e]',
        badgeText: 'text-white',
        description: 'Short intro plus clear points',
        gradientFrom: '#fde9e1',
        gradientTo: '#c7512e',
    },
    {
        id: '15',
        label: '15 Marks',
        sublabel: 'Long Answer',
        emoji: '📖',
        bg: 'bg-[#efe7ef]',
        activeBg: 'bg-[#6b395d]',
        border: 'border-[#d2bfd1]',
        activeBorder: 'border-[#512445]',
        text: 'text-[#6b395d]',
        activeText: 'text-white',
        badgeBg: 'bg-[#6b395d]',
        badgeText: 'text-white',
        description: 'Structured law exam answer',
        gradientFrom: '#f3ebf5',
        gradientTo: '#6b395d',
    },
];

// ─── Groq API Helper ───────────────────────────────────────────────
// Uses compound-beta model which has built-in web search (100% free)
async function callGroq(systemPrompt, messages, onStream, onStatus, onSources) {
    if (!GROQ_API_KEY) {
        throw new Error(GROQ_SETUP_MESSAGE);
    }

    onStatus?.('🌐 Connecting to Groq AI...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'compound-beta',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
            ],
            stream: true,
            max_tokens: 2048,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Groq API Error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    const sources = [];
    let searchShown = false;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;

            try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;

                // Detect tool/search calls
                if (delta.tool_calls && !searchShown) {
                    searchShown = true;
                    onStatus?.('🔍 Searching the web...');
                }

                // Text streaming
                if (delta.content) {
                    if (fullText === '') onStatus?.('✍️ Writing your answer...');
                    fullText += delta.content;
                    onStream(fullText);
                }

                // Extract search sources from annotations / tool results
                const annotations = parsed.choices?.[0]?.message?.annotations || delta.annotations || [];
                for (const ann of annotations) {
                    if (ann.type === 'url_citation' && ann.url_citation?.url) {
                        const { url, title } = ann.url_citation;
                        if (!sources.find(s => s.url === url)) {
                            sources.push({ url, title: title || url });
                            onSources?.([...sources]);
                            onStatus?.(`📖 Reading ${sources.length} source${sources.length > 1 ? 's' : ''}...`);
                        }
                    }
                }
            } catch (_) { }
        }
    }
    return { text: fullText, sources };
}


// Simple markdown → HTML (no external lib needed)
function renderMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hul]|<\/[hul]|<li)(.+)$/gm, '<p>$1</p>')
        .replace(/<p><\/p>/g, '')
        .replace(/<ul><ul>/g, '<ul>')
        .replace(/<\/ul><\/ul>/g, '</ul>');
}

// ─── Navbar ───────────────────────────────────────────────────────
function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handler);
        return () => window.removeEventListener('scroll', handler);
    }, []);

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#fff8f0]/85 backdrop-blur-xl shadow-[0_12px_40px_rgba(64,33,17,0.08)] border-b border-[rgba(89,62,47,0.12)]' : 'bg-transparent'
            }`}>
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
                        style={{ background: 'linear-gradient(135deg, #c7512e, #d89b2b)' }}>
                        <GraduationCap size={22} className="text-white" />
                    </div>
                    <div>
                        <span className="font-['Space_Grotesk'] font-bold text-xl text-[#33251d]">StudyPro</span>
                        <span className="font-['Fraunces'] font-bold text-xl ml-1 brand-gradient-text">
                            Assistant
                        </span>
                    </div>
                </div>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-6">
                    {['hero', 'study-tool', 'papers'].map(id => (
                        <button key={id} onClick={() => scrollTo(id)}
                            className="ink-link font-['Space_Grotesk'] font-medium capitalize">
                            {id === 'hero' ? 'Home' : id === 'study-tool' ? 'Study' : 'Papers'}
                        </button>
                    ))}
                </div>

                {/* Mobile menu button */}
                <button className="md:hidden p-2 rounded-xl text-[#5a483f]" onClick={() => setMenuOpen(!menuOpen)}>
                    <Menu size={24} />
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden bg-[#fff8f0]/95 backdrop-blur-xl border-t border-[rgba(89,62,47,0.12)] px-4 py-4 space-y-3">
                    {['Home', 'Study', 'Papers'].map(label => (
                        <button key={label} className="block w-full text-left font-['Space_Grotesk'] text-[#4f4138] py-2"
                            onClick={() => scrollTo(label === 'Home' ? 'hero' : label === 'Study' ? 'study-tool' : 'papers')}>
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </nav>
    );
}

// ─── Hero ─────────────────────────────────────────────────────────
function Hero({ onScrollToStudy }) {
    const doodles = [
        { emoji: '⭐', cls: 'doodle-float-a', style: { top: '12%', left: '8%', fontSize: '2.5rem', opacity: 0.5 } },
        { emoji: '✏️', cls: 'doodle-float-b', style: { top: '25%', right: '10%', fontSize: '2.2rem', opacity: 0.45 } },
        { emoji: '📚', cls: 'doodle-float-c', style: { bottom: '20%', left: '5%', fontSize: '2rem', opacity: 0.4 } },
        { emoji: '💡', cls: 'doodle-float-d', style: { top: '60%', right: '8%', fontSize: '2rem', opacity: 0.45 } },
        { emoji: '🎯', cls: 'doodle-float-e', style: { top: '40%', left: '3%', fontSize: '1.8rem', opacity: 0.35 } },
        { emoji: '🌟', cls: 'doodle-float-a', style: { bottom: '35%', right: '4%', fontSize: '1.6rem', opacity: 0.4 } },
        { emoji: '🎉', cls: 'doodle-float-c', style: { top: '15%', left: '45%', fontSize: '1.4rem', opacity: 0.3 } },
        { emoji: '🔬', cls: 'doodle-float-b', style: { bottom: '15%', right: '20%', fontSize: '1.8rem', opacity: 0.3 } },
    ];

    return (
        <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 bg-pattern"
            style={{ background: 'linear-gradient(160deg, #fff7ee 0%, #f8e6d8 34%, #f1ede3 72%, #efe2d9 100%)' }}>

            {/* Floating doodles */}
            {doodles.map((d, i) => (
                <div key={i} className={d.cls} style={{ position: 'absolute', ...d.style, pointerEvents: 'none' }}>
                    {d.emoji}
                </div>
            ))}

            {/* Big gradient blobs */}
            <div className="hero-orb top-20 left-20 w-72 h-72"
                style={{ background: 'radial-gradient(circle, rgba(199,81,46,0.9) 0%, transparent 68%)' }} />
            <div className="hero-orb bottom-20 right-20 w-64 h-64"
                style={{ background: 'radial-gradient(circle, rgba(63,107,91,0.78) 0%, transparent 68%)' }} />
            <div className="hero-orb top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96"
                style={{ background: 'radial-gradient(circle, rgba(107,57,93,0.65) 0%, transparent 68%)' }} />

            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                {/* Badge */}
                <div className="stagger-1 inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6 glass-panel">
                    <span className="text-lg">🎓</span>
                    <span className="font-['Space_Grotesk'] text-[#8f3e22] font-semibold text-base">StudyPro Learning Hub</span>
                    <span className="text-lg">🎓</span>
                </div>

                {/* Main heading */}
                <h1 className="stagger-2 font-['Fraunces'] font-bold text-5xl md:text-7xl leading-tight mb-4 text-[#2f241d]">
                    Study Smart.{' '}
                    <span className="hero-gradient-text">
                        Score Big.
                    </span>{' '}
                    <span className="inline-block animate-wiggle">🎉</span>
                </h1>

                {/* Subtext */}
                <p className="stagger-3 font-['DM_Sans'] text-xl text-[#66574e] mb-10 max-w-2xl mx-auto leading-relaxed">
                    Your AI-powered study assistant for exam prep. Get instant 2-mark, 5-mark & 15-mark answers
                    crafted by AI. <strong className="text-[#8f3e22]">Sharper prep, better structure, less last-minute panic.</strong>
                </p>

                {/* CTA Buttons */}
                <div className="stagger-4 flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={onScrollToStudy}
                        className="btn-bounce flex items-center justify-center gap-3 text-white font-['Space_Grotesk'] font-bold text-lg px-8 py-4 rounded-2xl shadow-xl"
                        style={{ background: 'linear-gradient(135deg,#c7512e,#6b395d)' }}>
                        <Sparkles size={22} />
                        Start Studying Now
                        <ArrowRight size={20} />
                    </button>
                    <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                        className="btn-bounce flex items-center justify-center gap-2 glass-panel font-['Space_Grotesk'] font-bold text-lg px-8 py-4 rounded-2xl text-[#3b2d24]">
                        <Lightbulb size={22} className="text-[#d89b2b]" />
                        How It Works
                    </button>
                </div>

                {/* Stats */}
                <div className="stagger-5 flex flex-wrap justify-center gap-6 mt-14">
                    {[
                        { val: '2, 5, 15', label: 'Mark Formats', emoji: '📄' },
                        { val: 'AI-Powered', label: 'Answers', emoji: '🤖' },
                        { val: 'MGU', label: 'Syllabus-Based', emoji: '📚' },
                        { val: '100%', label: 'Free to Use', emoji: '🎁' },
                    ].map(stat => (
                        <div key={stat.label} className="glass-panel rounded-2xl px-5 py-3">
                            <div className="font-['Space_Grotesk'] font-bold text-xl text-[#2f241d]">{stat.emoji} {stat.val}</div>
                            <div className="font-['DM_Sans'] text-sm text-[#73645a]">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Wave divider */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 40 Q360 80 720 40 Q1080 0 1440 40 L1440 80 L0 80 Z" fill="white" fillOpacity="0.9" />
                </svg>
            </div>
        </section>
    );
}

// ─── How It Works ─────────────────────────────────────────────────
function HowItWorks() {
    const steps = [
        { n: '01', emoji: '🎯', title: 'Pick Your Marks', desc: 'Choose between 2, 5, or 15 marks format based on your exam requirement.', color: '#4F46E5', bg: '#EEF2FF' },
        { n: '02', emoji: '✏️', title: 'Ask Your Question', desc: 'Type your MGU exam question or doubt in the text area. Choose 2, 5, or 15 marks.', color: '#CE93D8', bg: '#FAF0FF' },
        { n: '03', emoji: '✨', title: 'Get Your Answer', desc: 'AI generates a perfectly structured, syllabus-aligned answer in seconds!', color: '#4FC3F7', bg: '#F0F8FF' },
    ];

    return (
        <section id="how-it-works" className="py-20" style={{ background: 'linear-gradient(180deg, rgba(255,249,242,0.6) 0%, rgba(248,239,228,0.9) 100%)' }}>
            <div className="max-w-5xl mx-auto px-4">
                <div className="text-center mb-14">
                    <span className="font-['Space_Grotesk'] tracking-[0.2em] uppercase text-[#8f3e22] text-sm font-semibold">Simple as 1, 2, 3</span>
                    <h2 className="font-['Fraunces'] font-bold text-4xl md:text-5xl text-[#2f241d] mt-3">How It Works 🧩</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {steps.map((step, i) => (
                        <div key={i} className={`card-hover stagger-${i + 1} rounded-3xl p-8 text-center glass-panel`}>
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-md text-3xl"
                                style={{ background: step.color + '20', border: `2px solid ${step.color}` }}>
                                {step.emoji}
                            </div>
                            <div className="font-['Space_Grotesk'] font-bold text-sm tracking-[0.2em] uppercase mb-2" style={{ color: step.color }}>
                                Step {step.n}
                            </div>
                            <h3 className="font-['Fraunces'] font-bold text-2xl text-[#2f241d] mb-3">{step.title}</h3>
                            <p className="font-['DM_Sans'] text-[#655950] leading-relaxed">{step.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Arrow connectors */}
                <div className="hidden md:flex justify-center mt-4 gap-0 items-center opacity-30">
                    {[0, 1].map(i => (
                        <div key={i} className="flex-1 flex justify-center">
                            <ArrowRight size={32} className="text-[#c7512e]" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}


// ─── Mark Tabs ────────────────────────────────────────────────────
function MarkTabs({ activeTab, setActiveTab }) {
    return (
        <div className="grid grid-cols-3 gap-3 mb-6">
            {MARK_TABS.map(tab => {
                const active = activeTab === tab.id;
                return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`tab-card text-center transition-all ${active
                            ? `${tab.activeBg} ${tab.activeBorder} shadow-xl scale-105`
                            : `${tab.bg} ${tab.border} hover:scale-102`}`}>
                        <div className={`text-3xl mb-1 ${active ? 'animate-bounce-slow' : ''}`}>{tab.emoji}</div>
                        <div className={`font-['Space_Grotesk'] font-bold text-lg ${active ? tab.activeText : tab.text}`}>
                            {tab.label}
                        </div>
                        <div className={`font-['DM_Sans'] font-medium text-sm ${active ? tab.activeText : 'text-[#6f6159]'}`}>
                            {tab.sublabel}
                        </div>
                        <div className={`font-['DM_Sans'] text-xs mt-1 hidden sm:block ${active ? tab.activeText : 'text-[#8a7b73]'}`}>
                            {tab.description}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Answer Display ───────────────────────────────────────────────
function AnswerDisplay({ answer, isLoading, searchStatus, sources, activeTab, onCopy, copied }) {
    const tab = MARK_TABS.find(t => t.id === activeTab);

    if (isLoading) {
        return (
            <div className="mt-6 p-6 glass-panel rounded-3xl border border-dashed border-[rgba(89,62,47,0.18)] text-center">
                {/* Animated search status */}
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <div className="text-4xl animate-spin-slow inline-block">🔍</div>
                    </div>
                    <p className="font-['Space_Grotesk'] font-bold text-[#3d3028] text-lg animate-pulse">
                        {searchStatus || 'Initializing...'}
                    </p>
                    {/* Step progress */}
                    <div className="flex items-center gap-2 text-xs font-['DM_Sans'] text-[#8a7b73]">
                        <span className={searchStatus?.includes('Searching') || searchStatus?.includes('Reading') || searchStatus?.includes('Writing') ? 'text-rose-500 font-700' : ''}>
                            🌐 Search
                        </span>
                        <span>→</span>
                        <span className={searchStatus?.includes('Reading') || searchStatus?.includes('Writing') ? 'text-purple-500 font-700' : ''}>
                            📖 Read
                        </span>
                        <span>→</span>
                        <span className={searchStatus?.includes('Writing') ? 'text-sky-500 font-700' : ''}>
                            ✍️ Answer
                        </span>
                    </div>
                    <div className="loading-dots flex justify-center mt-1">
                        <span></span><span></span><span></span>
                    </div>
                    {sources?.length > 0 && (
                        <div className="w-full text-left mt-2">
                            <p className="font-['Space_Grotesk'] text-[#6f6159] text-sm mb-1">Sources found:</p>
                            <div className="space-y-1">
                                {sources.slice(0, 3).map((s, i) => (
                                    <a key={i} href={s.url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-1 text-xs font-['DM_Sans'] text-[#3f6b5b] hover:text-[#29473d] truncate">
                                        <span>🔗</span>
                                        <span className="truncate">{s.title}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!answer) return null;

    return (
        <div className="mt-6 answer-card">
            <div className="mb-2 flex items-center gap-2">
                <span className={`font-['Space_Grotesk'] font-bold text-xl ${tab?.text}`}>{tab?.emoji} {tab?.sublabel} —</span>
                <span className="font-['DM_Sans'] text-[#6f6159] text-lg">Here's your answer!</span>
            </div>

            <div className="relative rounded-3xl p-6 shadow-xl border"
                style={{ background: `linear-gradient(135deg, ${tab?.gradientFrom}55, rgba(255,250,244,0.96))`, borderColor: tab?.gradientTo + '45' }}>
                {/* Copy button */}
                <button onClick={onCopy}
                    className="absolute top-4 right-4 btn-bounce flex items-center gap-1 bg-[rgba(255,251,246,0.95)] border border-[rgba(89,62,47,0.12)] rounded-xl px-3 py-1.5 text-xs font-['Space_Grotesk'] font-bold text-[#5f5047] shadow-sm">
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>

                {/* Answer content */}
                <div className="answer-content font-['DM_Sans'] text-[#3a2f28] leading-relaxed pr-16"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }} />

                {/* Badges row */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className={`inline-flex items-center gap-1 ${tab?.badgeBg} ${tab?.badgeText} text-xs font-['Space_Grotesk'] font-bold px-3 py-1 rounded-full`}>
                        <Award size={12} />
                        Optimized for {activeTab}-mark answer
                    </div>
                    {sources?.length > 0 && (
                        <div className="inline-flex items-center gap-1 bg-[rgba(63,107,91,0.12)] text-[#315547] text-xs font-['Space_Grotesk'] font-bold px-3 py-1 rounded-full">
                            🌐 {sources.length} web source{sources.length > 1 ? 's' : ''} used
                        </div>
                    )}
                </div>

                {/* Sources list */}
                {sources?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[rgba(89,62,47,0.12)]">
                        <p className="font-['Space_Grotesk'] text-[#8a7b73] text-sm mb-1">📚 Sources searched:</p>
                        <div className="space-y-1">
                            {sources.map((s, i) => (
                                <a key={i} href={s.url} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1 text-xs font-['DM_Sans'] text-[#3f6b5b] hover:text-[#29473d] hover:underline truncate max-w-full">
                                    <span className="flex-shrink-0">🔗</span>
                                    <span className="truncate">{s.title}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Study Tool ──────────────────────────────────────────────
function StudyTool() {
    const [question, setQuestion] = useState('');
    const [activeTab, setActiveTab] = useState('2');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchStatus, setSearchStatus] = useState('');
    const [sources, setSources] = useState([]);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setAnswer('');
        setSources([]);
        setError('');
        setCopied(false);
        setSearchStatus('');
    }, [activeTab]);

    const handleGenerate = async () => {
        if (!question.trim()) { setError('Please type a question first! ✏️'); return; }
        setError('');
        setIsLoading(true);
        setAnswer('');
        setSources([]);
        setSearchStatus('🌐 Connecting...');

        const markConfigs = {
            '2': {
                label: '2-mark',
                systemRules: `Write only a 2-mark answer.
- Give a precise legal definition.
- Mention the relevant section or concept only if applicable.
- Length: about 20-40 words.
- Do not add headings, bullet points, or extra explanation unless the question itself asks for them.`,
                userInstruction: 'Answer strictly in 2-mark format. Return only the short answer needed for a 2-mark question.',
            },
            '5': {
                label: '5-mark',
                systemRules: `Write only a 5-mark answer.
- Start with a short definition or introduction.
- Explain the concept in 2-3 clear points or a short paragraph structure.
- Mention the relevant section or example if possible.
- Length: about 80-120 words.
- Do not expand into a long-answer format or include 15-mark style headings.`,
                userInstruction: 'Answer strictly in 5-mark format. Return only the content suitable for a 5-mark answer.',
            },
            '15': {
                label: '15-mark',
                systemRules: `Write only a 15-mark answer.
- Use these headings exactly where suitable:
  1. Introduction
  2. Legal provisions or principles
  3. Explanation with subpoints
  4. Case law or example (if relevant)
  5. Conclusion
- Length: about 250-350 words.
- Write in clear paragraphs suitable for law exams.`,
                userInstruction: 'Answer strictly in 15-mark format. Return only the content suitable for a 15-mark answer.',
            },
        };
        const selectedMark = markConfigs[activeTab];

        const systemPrompt = `You are an expert academic assistant writing LL.B answers in Mahatma Gandhi University (MGU) exam format. Write in clear, formal, textbook-style legal language suitable for university law exams. Prioritize syllabus-aligned legal concepts, correct statutory provisions, accepted legal principles, and standard exam presentation. Search the web only when needed to verify law, but never invent section numbers, case names, illustrations, or legal propositions. If a point is uncertain, omit the doubtful detail and answer only with academically reliable material. Always answer all parts of the question completely.

Selected answer format: ${selectedMark.label}

${selectedMark.systemRules}

IMPORTANT:
- Do NOT include any opening line identifying the course, semester, paper, or subject.
- Just provide the direct exam answer.
- If the question includes a number such as '3.', begin with that question number in bold.
- Mention relevant sections, legal principles, and case law only when applicable and reliable.
- Do not include content intended for any other mark category.
- Use markdown tables only for comparison-based questions; otherwise prefer headings, short paragraphs, and numbered points where needed only if they fit the selected mark format.`;

        const cleanedQuestion = question.replace(/^#+\s*/gm, '').trim();
        const numberedQuestion = cleanedQuestion.replace(/^(\d+)\./, '**$1.**');
        const userMessage = `Write a complete LL.B exam-style answer for the question below in MGU format. ${selectedMark.userInstruction} Answer all subparts fully. Start with the question number in bold if present. Mention relevant sections, legal principles, and case law only where applicable and reliable.\n\nQuestion text: ${numberedQuestion}`;

        try {
            const result = await callGroq(
                systemPrompt,
                [{ role: 'user', content: userMessage }],
                (text) => setAnswer(text),
                (status) => setSearchStatus(status),
                (srcs) => setSources(srcs),
            );
            if (result.sources?.length) setSources(result.sources);
        } catch (err) {
            setError(`Oops! ${err.message}`);
        } finally {
            setIsLoading(false);
            setSearchStatus('');
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(answer);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section id="study-tool" className="py-20" style={{ background: 'linear-gradient(180deg, rgba(255,248,240,0.72) 0%, rgba(244,233,222,0.92) 100%)' }}>
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <span className="font-['Space_Grotesk'] tracking-[0.2em] uppercase text-[#6b395d] text-sm font-semibold">Exam Assist</span>
                    <h2 className="font-['Fraunces'] font-bold text-4xl md:text-5xl text-[#2f241d] mt-3">
                        Get Answers Instantly 🤖✨
                    </h2>
                    <p className="font-['DM_Sans'] text-[#655950] mt-3 text-lg">
                        Searches the web and keeps the answer clean, structured, and exam-ready.
                    </p>
                </div>

                {/* Main tool card */}
                <div className="glass-panel rounded-[2rem] p-6 md:p-8">

                    {/* Mark Tabs */}
                    <MarkTabs activeTab={activeTab} setActiveTab={setActiveTab} />

                    {/* Question Input */}
                    <div className="mb-4">
                        <label className="font-['Space_Grotesk'] text-[#54443a] font-semibold text-lg block mb-2 ml-1">
                            💬 Your Question
                        </label>
                        <textarea
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
                            placeholder="Type your MGU exam question here... ✏️  (Ctrl+Enter to search)"
                            rows={4}
                            className="w-full font-['DM_Sans'] text-[#2f241d] bg-[rgba(255,251,246,0.92)] border border-[rgba(89,62,47,0.16)] rounded-2xl px-5 py-4 resize-none focus:outline-none focus:border-[#c7512e] focus:ring-4 focus:ring-[rgba(199,81,46,0.12)] transition-all text-base leading-relaxed"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 bg-[rgba(199,81,46,0.08)] border border-[rgba(199,81,46,0.25)] rounded-2xl px-4 py-3 text-[#a23b1c] font-['DM_Sans'] text-sm flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {/* Generate button */}
                    <div className="flex gap-3">
                        <button onClick={handleGenerate} disabled={isLoading}
                            className="btn-bounce flex-1 flex items-center justify-center gap-3 text-white font-['Space_Grotesk'] font-semibold text-lg py-4 rounded-2xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ background: isLoading ? '#7b4b3d' : 'linear-gradient(135deg,#c7512e,#6b395d)' }}>
                            {isLoading ? (
                                <><div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />{searchStatus || 'Searching...'}</>
                            ) : (
                                <><span>🌐</span> Search & Get Answer ✨</>
                            )}
                        </button>
                        {answer && (
                            <button onClick={() => { setAnswer(''); setSources([]); }}
                                className="btn-bounce px-4 py-4 bg-[rgba(255,251,246,0.92)] hover:bg-[rgba(248,234,224,0.95)] rounded-2xl text-[#67574f] transition-colors border border-[rgba(89,62,47,0.12)]">
                                <RotateCcw size={20} />
                            </button>
                        )}
                    </div>

                    {/* Answer */}
                    <AnswerDisplay
                        answer={answer} isLoading={isLoading}
                        searchStatus={searchStatus} sources={sources}
                        activeTab={activeTab} onCopy={handleCopy} copied={copied}
                    />
                </div>
            </div>
        </section>
    );
}

// ─── Doubt Chat ───────────────────────────────────────────────────
function DoubtChat({ isOpen, onClose }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hey! 👋 I'm your Exam Assist bot! Ask me anything about your subjects, concepts, or exam doubts. I'm here to help! 🎓✨" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 400);
    }, [isOpen]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        const systemPrompt = `You are a friendly, encouraging academic tutor for university students. Search the web when needed to find current, accurate information. Help students understand concepts, clarify doubts, and prepare for exams. Be supportive, use simple language, give examples, and keep responses concise but helpful. Use emojis occasionally to keep the energy positive! 🎓`;

        const history = messages.map(m => ({ role: m.role, content: m.content }));
        history.push({ role: 'user', content: userMsg });

        setMessages(prev => [...prev, { role: 'assistant', content: '🔍 Searching...' }]);

        try {
            await callGemini(
                systemPrompt,
                history,
                (text) => {
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { role: 'assistant', content: text };
                        return updated;
                    });
                },
                (status) => {
                    setMessages(prev => {
                        const updated = [...prev];
                        if (updated[updated.length - 1]?.content?.startsWith('🔍') ||
                            updated[updated.length - 1]?.content?.startsWith('📖') ||
                            updated[updated.length - 1]?.content?.startsWith('✍️') ||
                            updated[updated.length - 1]?.content?.startsWith('🌐')) {
                            updated[updated.length - 1] = { role: 'assistant', content: status };
                        }
                        return updated;
                    });
                },
            );
        } catch (err) {
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: `Sorry, something went wrong! 😅 ${err.message}` };
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="chat-overlay" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 z-50 flex flex-col bg-white shadow-2xl animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100"
                    style={{ background: 'linear-gradient(135deg,#FF6B6B,#CE93D8)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">🤖</div>
                        <div>
                            <div className="font-baloo font-700 text-white text-lg">Exam Assist</div>
                            <div className="font-nunito text-white/80 text-xs">Ask me anything! 💡</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-400 to-purple-400 flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0">
                                    🤖
                                </div>
                            )}
                            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                                {msg.content === '...' ? (
                                    <div className="loading-dots flex">
                                        <span></span><span></span><span></span>
                                    </div>
                                ) : (
                                    <p className="font-nunito text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border-2 border-gray-200 focus-within:border-rose-400 transition-colors p-2">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask your doubt here... 🤔"
                            rows={1}
                            className="flex-1 bg-transparent font-nunito text-gray-700 text-sm resize-none focus:outline-none px-2 py-1 leading-relaxed"
                            style={{ minHeight: '36px', maxHeight: '100px' }}
                        />
                        <button onClick={sendMessage} disabled={isLoading || !input.trim()}
                            className="btn-bounce flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#FF6B6B,#CE93D8)' }}>
                            <Send size={16} />
                        </button>
                    </div>
                    <p className="font-nunito text-xs text-gray-400 text-center mt-2">Press Enter to send • Shift+Enter for new line</p>
                </div>
            </div>
        </>
    );
}

// ─── Paper Analyzer ───────────────────────────────────────────────
function PaperAnalyzer() {
    const [paperText, setPaperText] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState(0);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        const pdfFiles = files.filter(f => f.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            setError('Please upload at least one valid PDF file! 📄');
            return;
        }

        setUploadedFiles(pdfFiles.length);
        setError('');
        setIsLoading(true);
        let fullText = '';

        try {
            for (const file of pdfFiles) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                fullText += `\n--- End of ${file.name} ---\n`;
            }
            setPaperText(fullText.trim());
        } catch (err) {
            console.error(err);
            setError('Failed to extract text from one of the PDFs. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const analyze = async () => {
        if (!paperText.trim()) { setError('Please paste or upload a question paper first! 📄'); return; }
        setError('');
        setIsLoading(true);
        setAnalysis('');

        const systemPrompt = `You are an expert university exam paper analyzer. When given one or more question papers, you MUST:
1. Identify repeated questions and patterns across all selected papers.
2. Highlight high-priority important questions likely to carry high marks.
3. Group all questions by mark value (2-mark, 5-mark, 10/15-mark).
4. Provide a structured, syllabus-aligned answer for every identified question.
5. Include a summary of how many PDFs were analyzed and how many repeated questions were found.
6. Format your response into these sections:
   ## 🔄 Repeated Questions & Patterns
   ## 🎯 High-Priority Important Questions
   ## 📝 Detailed Answers (Grouped by Marks)

IMPORTANT: Do NOT include any tables or text identifying the course, semester, or specific subject name as an intro. Just jump straight into the analysis sections. Format using markdown: ## for headings, ** for bold, - for bullet points. Ensure the style matches exam standards.`;

        const userMessage = `Please analyze ${uploadedFiles} uploaded PDF(s) and provide the structured sections as requested:\n\n${paperText}`;

        try {
            await callGroq(systemPrompt, [{ role: 'user', content: userMessage }], (text) => {
                setAnalysis(text);
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section id="papers" className="py-20 bg-white">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-12">
                    <span className="font-caveat text-sky-500 text-xl font-600">Exam Prep 📄</span>
                    <h2 className="font-baloo font-800 text-4xl md:text-5xl text-gray-800 mt-1">
                        Previous Year Paper Analyzer 🔍
                    </h2>
                    <p className="font-nunito text-gray-500 mt-3 text-lg">
                        Paste text or upload a PDF — AI will extract repeated questions and provide answers! 🤖
                    </p>
                </div>

                <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-[2rem] p-6 md:p-8 border-2 border-sky-100 shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                        <label className="font-caveat text-sky-600 font-600 text-xl">
                            📋 Paste or Upload Paper
                        </label>
                        <button onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 bg-white border-2 border-sky-300 text-sky-600 px-4 py-2 rounded-xl text-sm font-nunito font-700 hover:bg-sky-50 transition-all shadow-sm">
                            <Download size={16} />
                            Upload PDFs
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" multiple />
                    </div>
                    <textarea
                        value={paperText}
                        onChange={e => setPaperText(e.target.value)}
                        placeholder={`Paste your question paper here...\n\nExample:\nPart A (2 Marks)\n1. Define data structure\n2. What is an algorithm?\n\nPart B (5 Marks)\n3. Explain stack with example...\n\nUploaded PDFs: ${uploadedFiles}`}
                        rows={10}
                        className="w-full font-nunito text-gray-700 bg-white border-2 border-sky-200 rounded-2xl px-5 py-4 resize-y focus:outline-none focus:border-sky-400 transition-colors text-base leading-relaxed"
                    />

                    {error && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 font-nunito text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    <button onClick={analyze} disabled={isLoading}
                        className="btn-bounce mt-4 flex items-center justify-center gap-3 text-white font-baloo font-700 text-lg w-full py-4 rounded-2xl shadow-lg disabled:opacity-60"
                        style={{ background: isLoading ? '#93C5FD' : 'linear-gradient(135deg,#4FC3F7,#0091EA)' }}>
                        {isLoading ? (
                            <><div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />Analyzing Paper...</>
                        ) : (
                            <><Brain size={22} />Analyze & Answer All Questions 🧠</>
                        )}
                    </button>

                    {isLoading && (
                        <div className="mt-6 p-6 bg-white rounded-2xl border-2 border-dashed border-sky-200 text-center">
                            <div className="text-4xl mb-3 animate-spin-slow inline-block">🔍</div>
                            <p className="font-nunito text-gray-500">Analyzing paper and crafting answers...</p>
                            <div className="loading-dots flex justify-center mt-3">
                                <span style={{ background: '#4FC3F7' }}></span>
                                <span style={{ background: '#0091EA' }}></span>
                                <span style={{ background: '#CE93D8' }}></span>
                            </div>
                        </div>
                    )}

                    {analysis && !isLoading && (
                        <div className="mt-6 answer-card">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-caveat text-sky-600 font-700 text-xl">📝 Analyzed & Answered!</span>
                                <button onClick={() => { navigator.clipboard.writeText(analysis); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                    className="btn-bounce flex items-center gap-1 bg-white border border-sky-200 rounded-xl px-3 py-1.5 text-xs font-nunito font-700 text-sky-600 shadow-sm">
                                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                    {copied ? 'Copied!' : 'Copy All'}
                                </button>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border-2 border-sky-100 shadow-md answer-content font-nunito text-gray-700 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

// ─── Motivational Banner ──────────────────────────────────────────
function MotivationalBanner() {
    const quotes = [
        "Success is the sum of small efforts, repeated day in and day out! 🌟",
        "Every topper was once a beginner who refused to give up! 💪",
        "Your hard work today = your success in the exam hall! 📚✨",
    ];
    const [quoteIdx, setQuoteIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setQuoteIdx(i => (i + 1) % quotes.length), 4000);
        return () => clearInterval(t);
    }, []);

    return (
        <section className="py-16 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #CE93D8 50%, #4FC3F7 100%)' }}>
            {/* Decorative circles */}
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full" />

            <div className="relative max-w-4xl mx-auto px-4 text-center">
                <div className="text-5xl mb-4 animate-bounce">🏆</div>
                <h2 className="font-baloo font-800 text-4xl md:text-5xl text-white mb-4">
                    You&apos;ve Got This! 💪
                </h2>
                <p className="font-nunito text-white/90 text-xl mb-6 min-h-[3rem] transition-all">
                    {quotes[quoteIdx]}
                </p>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-6 py-3">
                    <Star size={20} className="text-yellow-300" fill="currentColor" />
                    <span className="font-baloo font-700 text-white text-xl">Upcoming Topper!</span>
                    <Star size={20} className="text-yellow-300" fill="currentColor" />
                </div>
            </div>
        </section>
    );
}

// ─── Footer ───────────────────────────────────────────────────────
function Footer() {
    return (
        <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-5xl mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,#FF6B6B,#CE93D8)' }}>
                                <GraduationCap size={22} className="text-white" />
                            </div>
                            <span className="font-baloo font-800 text-xl">Exam Assist</span>
                        </div>
                        <p className="font-nunito text-gray-400 text-sm leading-relaxed">
                            AI-powered exam prep for university students. Study smarter, score higher! 🎓
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-baloo font-700 text-lg mb-4 text-rose-400">Quick Links</h3>
                        <ul className="space-y-2">
                            {[['Home', 'hero'], ['Study Tool', 'study-tool'], ['Paper Analyzer', 'papers'], ['How It Works', 'how-it-works']].map(([label, id]) => (
                                <li key={id}>
                                    <button onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                                        className="font-nunito text-gray-400 hover:text-rose-400 transition-colors text-sm">
                                        {label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Courses */}
                    <div>
                        <h3 className="font-baloo font-700 text-lg mb-4 text-sky-400">Courses Supported</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(COURSES).map(c => (
                                <span key={c} className="font-nunito text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="font-nunito text-gray-500 text-sm">
                        © 2025 Exam Assist • Made with ❤️ for students
                    </p>
                    <p className="font-caveat text-gray-400 text-base">
                        Study Smart. Score Big. 🌟
                    </p>
                </div>
            </div>
        </footer>
    );
}

// ─── App ──────────────────────────────────────────────────────────
export default function App() {
    const scrollToStudy = () => {
        document.getElementById('study-tool')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen">
            <Navbar />
            <Hero onScrollToStudy={scrollToStudy} />
            <HowItWorks />
            <StudyTool />
            <PaperAnalyzer />
            <MotivationalBanner />
            <Footer />

        </div>
    );
}
