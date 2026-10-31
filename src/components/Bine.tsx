import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { api, type Usage } from '../lib/api';
import { useSession } from '../lib/session';
import { LANGS } from '../lib/languages';
import { usePrefs } from '../lib/prefs';

interface Msg { role: 'user' | 'model'; text: string }

// The Web Speech API isn't in TypeScript's DOM types everywhere
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const SpeechRec = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;

function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang === lang) ?? window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang.slice(0, 2)));
  if (voice) u.voice = voice;
  u.rate = 1;
  window.speechSynthesis.speak(u);
}

/** "Talk to Bine": speak or type in your language; Bine answers in the same language and reads it aloud */
export function Bine() {
  const { requireLogin, setUsage, usage } = useSession();
  const { prefs, setPref } = usePrefs();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(() => prefs.bineLang || (LANGS.find((l) => l.code.startsWith(navigator.language.slice(0, 2)))?.code ?? 'en-IN'));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const voiceOn = prefs.bineVoice;
  const setVoiceOn = (v: boolean) => setPref('bineVoice', v);
  const [error, setError] = useState('');
  const rec = useRef<Recognition | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, busy]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const place = new URLSearchParams(location.search).get('name') ?? '';

  function toggle() {
    if (open) {
      setOpen(false);
      window.speechSynthesis?.cancel();
      return;
    }
    if (requireLogin('Bine, the voice assistant, is free with an account.', () => setOpen(true))) setOpen(true);
  }

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', text: q }];
    setMsgs(next);
    setText('');
    setBusy(true);
    setError('');
    try {
      const r = await api<{ reply: string; usage: Usage }>('assistant', {
        method: 'POST', body: { messages: next.slice(-12), language: LANGS.find((l) => l.code === lang)?.name ?? 'English', place },
      });
      setMsgs([...next, { role: 'model', text: r.reply }]);
      setUsage(r.usage);
      if (voiceOn) speak(r.reply, lang);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function listen() {
    if (!SpeechRec) return setError('Voice input works in Chrome and Edge. You can still type below.');
    if (listening) return rec.current?.stop();
    window.speechSynthesis?.cancel();
    const r = new SpeechRec();
    r.lang = lang;
    r.interimResults = true;
    setText('');
    r.continuous = false;
    let finalText = '';
    r.onresult = (e) => {
      const parts = Array.from(e.results);
      setText(parts.map((p) => p[0]?.transcript ?? '').join(' '));
      if (parts.every((p) => p.isFinal)) finalText = parts.map((p) => p[0]?.transcript ?? '').join(' ');
    };
    r.onerror = (e) => setError(({
      'not-allowed': 'Microphone access is blocked. Allow it in the address bar (the mic or lock icon), then try again.',
      'service-not-allowed': 'Microphone access is blocked. Allow it in the address bar (the mic or lock icon), then try again.',
      'no-speech': 'I didn’t hear anything. Tap the mic and start speaking straight away.',
      'audio-capture': 'No microphone was found. Check that one is connected, or type instead.',
      'network': 'Voice recognition needs a connection to your browser’s speech service. Check your internet, or type instead.',
      'language-not-supported': 'Voice input in this language isn’t available in this browser. Type instead, or pick English.',
      'aborted': '',
    } as Record<string, string>)[e.error] ?? `Voice input stopped (${e.error}). You can type instead.`);
    r.onend = () => {
      setListening(false);
      if (finalText) void send(finalText);
    };
    rec.current = r;
    setError('');
    setListening(true);
    r.start();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(text);
  }

  return (
    <>
      <button className={`bine-fab ${open ? 'bine-fab--open' : ''}`} onClick={toggle} aria-label={open ? 'Close Bine' : 'Talk to Bine, the AI assistant'}>
        <BineMark />
        <span>{open ? 'Close' : 'Ask Bine'}</span>
      </button>
      {open && (
        <section className="bine panel" aria-label="Bine, the AI travel assistant">
          <header className="bine__head">
            <BineMark size={34} />
            <div>
              <h2>Bine</h2>
              <p className="fineprint">Speak or type in your language{place ? `, about ${place}` : ''}</p>
            </div>
            <label className="sr-only" htmlFor="bine-lang">Language</label>
            <select id="bine-lang" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </header>
          <div className="bine__log" aria-live="polite">
            {msgs.length === 0 && (
              <div className="bine__hello">
                <p>Hi! I’m Bine. Ask me anything: trips, places, budgets, or any other question.</p>
                <div className="chips">
                  {['Best time to visit Munnar?', 'Plan 2 days in Hampi', 'Is Tirupati crowded on weekends?'].map((s) => (
                    <button key={s} onClick={() => void send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`bubble bubble--${m.role}`}>
                <p>{m.text}</p>
                {m.role === 'model' && <button className="linkish small" onClick={() => speak(m.text, lang)}>Play again</button>}
              </div>
            ))}
            {busy && <div className="bubble bubble--model bubble--typing" aria-label="Bine is thinking"><span /><span /><span /></div>}
            <div ref={end} />
          </div>
          {error && <p className="error small bine__err">{error}</p>}
          <form className="bine__input" onSubmit={submit}>
            <button type="button" className={`mic ${listening ? 'mic--on' : ''}`} onClick={listen} aria-label={listening ? 'Stop listening' : 'Speak'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? 'Listening…' : 'Type a question…'} maxLength={500} aria-label="Your question" />
            <button className="btn btn--primary btn--sm" disabled={busy || !text.trim()}>Send</button>
          </form>
          <div className="bine__foot">
            <label className="small"><input type="checkbox" checked={voiceOn} onChange={(e) => { setVoiceOn(e.target.checked); if (!e.target.checked) window.speechSynthesis?.cancel(); }} /> Read answers aloud</label>
            {usage?.aiEnabled && <span className="fineprint">{usage.remaining} AI requests left today</span>}
          </div>
        </section>
      )}
    </>
  );
}

/** Bine's icon: a speech bubble with a sound wave */
function BineMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="bine-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2dd4bf" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
      <path d="M16 3C8.8 3 3 8.2 3 14.6c0 3.5 1.7 6.6 4.5 8.7L6.4 29l6-3.2c1.2.3 2.4.4 3.6.4 7.2 0 13-5.2 13-11.6S23.2 3 16 3z" fill="url(#bine-g)" />
      <path d="M9.5 15v1M12.5 12.5v6M15.5 10.5v10M18.5 12.5v6M21.5 15v1" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
