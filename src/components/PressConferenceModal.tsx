import React, { useState, useEffect } from 'react';
import { Mic, X, Send, MessageSquare } from 'lucide-react';
import { audioEngine } from '../utils/audio';

const PRESS_QUOTES_KEY = 'career_press_quotes';

export interface PressQuote {
  id: string;
  season: string;
  award: string;
  quote: string;
  timestamp: string;
}

interface PressConferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: string;
  award: string;
  playerName: string;
  onQuoteSubmitted: (quote: PressQuote) => void;
}

export const PressConferenceModal: React.FC<PressConferenceModalProps> = ({
  isOpen,
  onClose,
  season,
  award,
  playerName,
  onQuoteSubmitted,
}) => {
  const [quote, setQuote] = useState('');
  const [charCount, setCharCount] = useState(0);
  const MAX_WORDS = 35;
  const MAX_CHARS = 200;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= MAX_WORDS && text.length <= MAX_CHARS) {
      setQuote(text);
      setCharCount(text.length);
    }
  };

  const handleSubmit = () => {
    if (quote.trim().length < 10) return;
    audioEngine.playClick();
    const newQuote: PressQuote = {
      id: `press_${Date.now()}`,
      season,
      award,
      quote: quote.trim(),
      timestamp: new Date().toISOString(),
    };
    onQuoteSubmitted(newQuote);
    setQuote('');
    setCharCount(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/40 via-zinc-900 to-amber-900/40 p-5 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Mic className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">PRESS CONFERENCE</h3>
                <p className="text-[10px] text-zinc-400">{season} • {award}</p>
              </div>
            </div>
            <button
              onClick={() => {
                audioEngine.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Mic icon + question */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-amber-400" />
            </div>
            <div className="bg-zinc-800 rounded-xl rounded-tl-sm px-4 py-2.5">
              <p className="text-xs text-zinc-300">
                Congratulations on winning <span className="text-amber-400 font-bold">{award}</span>! 
                How are you feeling about this achievement?
              </p>
            </div>
          </div>

          {/* Player response */}
          <div className="flex items-start gap-3 flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-black text-zinc-950">
              {playerName.charAt(0)}
            </div>
            <div className="flex-1">
              <textarea
                value={quote}
                onChange={handleChange}
                placeholder="Share your thoughts on winning this award..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none h-24"
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[10px] font-mono ${charCount > MAX_CHARS * 0.9 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {quote.trim() ? quote.trim().split(/\s+/).filter(Boolean).length : 0}/{MAX_WORDS} words
                </span>
                <span className="text-[10px] text-zinc-600">
                  {charCount}/{MAX_CHARS} chars
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-[10px] text-zinc-600">
            Your quote will appear in the news feed as pundits discuss your words
          </p>
          <button
            onClick={handleSubmit}
            disabled={quote.trim().length < 10}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
              quote.trim().length >= 10
                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Submit Quote
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper to get stored press quotes
export function getStoredPressQuotes(): PressQuote[] {
  try {
    return JSON.parse(localStorage.getItem(PRESS_QUOTES_KEY) || '[]');
  } catch {
    return [];
  }
}

// Helper to save a press quote
export function savePressQuote(quote: PressQuote): void {
  const existing = getStoredPressQuotes();
  // Don't duplicate for same season+award
  if (!existing.some(q => q.season === quote.season && q.award === quote.award)) {
    existing.push(quote);
    localStorage.setItem(PRESS_QUOTES_KEY, JSON.stringify(existing));
  }
}

// Helper to check if a quote exists for this season+award
export function hasPressQuote(season: string, award: string): boolean {
  return getStoredPressQuotes().some(q => q.season === season && q.award === award);
}
