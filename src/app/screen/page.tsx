'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoundStateDTO } from '@/lib/types';

const CHOICE_COLORS = [
  'bg-red-500/30 border-red-500',
  'bg-blue-500/30 border-blue-500',
  'bg-green-500/30 border-green-500',
  'bg-yellow-500/30 border-yellow-500',
];
const BAR_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
];
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

interface ParsedQuestion {
  question: string;
  choices: string[];
  answer_index: number;
}

// ===== フリーフォーマットのパーサー =====
function parseQuestions(text: string): { questions: ParsedQuestion[]; errors: string[] } {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];

  // Qの前で分割（Q1, Q2, Q1., Q1． など対応)
  const blocks = text.split(/(?=Q\d+[.．]?[\s　])/i).filter(b => b.trim());

  if (blocks.length === 0) {
    errors.push('問題が見つかりません。Q1 で始めてください。');
    return { questions, errors };
  }

  for (const block of blocks) {
    // Q番号を抽出
    const qMatch = block.match(/^Q(\d+)[.．]?[\s　]+/i);
    if (!qMatch) continue;
    const qNum = parseInt(qMatch[1]);

    // Q番号以降のテキスト
    let rest = block.slice(qMatch[0].length);

    // A{n}-1, A{n}-2, A{n}-3, A{n}-4, 正解 を探す
    // まずA{n}-1の位置を探す
    const a1Pattern = new RegExp(`A${qNum}-1[\\s　]+`, 'i');
    const a1Match = rest.match(a1Pattern);
    if (!a1Match || a1Match.index === undefined) {
      errors.push(`Q${qNum}: 選択肢 A${qNum}-1 が見つかりません`);
      continue;
    }

    const questionText = rest.slice(0, a1Match.index).replace(/[,、\s]+$/, '').trim();
    if (!questionText) {
      errors.push(`Q${qNum}: 問題文が空です`);
      continue;
    }

    // 選択肢を抽出
    const choices: string[] = [];
    let ok = true;
    for (let ci = 1; ci <= 4; ci++) {
      const choicePattern = new RegExp(`A${qNum}-${ci}[\\s　]+`, 'i');
      const nextPattern = ci < 4
        ? new RegExp(`A${qNum}-${ci + 1}[\\s　]`, 'i')
        : /正解[\s　::：]/;
      
      const cMatch = rest.match(choicePattern);
      if (!cMatch || cMatch.index === undefined) {
        errors.push(`Q${qNum}: 選択肢 A${qNum}-${ci} が見つかりません`);
        ok = false;
        break;
      }

      const startPos = cMatch.index + cMatch[0].length;
      const afterChoice = rest.slice(startPos);
      const nMatch = afterChoice.match(nextPattern);
      const choiceText = nMatch
        ? afterChoice.slice(0, nMatch.index).replace(/[,、\s]+$/, '').trim()
        : afterChoice.replace(/[,、\s]+$/, '').trim();

      if (!choiceText) {
        errors.push(`Q${qNum}: 選択肢 A${qNum}-${ci} のテキストが空です`);
        ok = false;
        break;
      }
      choices.push(choiceText);
    }
    if (!ok) continue;

    // 正解を抽出（正解 A1-3 / 正解：A1-3 / 正解:A1-3 など対応）
    const answerPattern = new RegExp(`正解[\\s　::：]*A${qNum}-(\\d)`, 'i');
    const ansMatch = rest.match(answerPattern);
    if (!ansMatch) {
      errors.push(`Q${qNum}: 正解が見つかりません（例: 正解 A${qNum}-1）`);
      continue;
    }
    const answerNum = parseInt(ansMatch[1]);
    if (answerNum < 1 || answerNum > 4) {
      errors.push(`Q${qNum}: 正解の番号は1〔4で指定してください`);
      continue;
    }

    questions.push({
      question: questionText,
      choices,
      answer_index: answerNum - 1,
    });
  }

  if (questions.length === 0 && errors.length === 0) {
    errors.push('問題を解析できませんでした。');
  }
  if (questions.length > 10) {
    errors.push(`問題数は最大10問までです（現在${questions.length}問）`);
  }

  return { questions, errors };
}


export default function ScreenPage() {
  const socketRef = useRef<Socket | null>(null);
  const [screenPhase, setScreenPhase] = useState<'setup' | 'ready' | 'playing'>('setup');
  const [state, setState] = useState<RoundStateDTO | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [playUrl, setPlayUrl] = useState<string>('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  const [choiceCounts, setChoiceCounts] = useState<number[]>([0, 0, 0, 0]);

  // 事前準備用
  const [inputText, setInputText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const requestNext = useCallback(() => {
    if (loading || allDone) return;
    setLoading(true);
    setChoiceCounts([0, 0, 0, 0]);
    socketRef.current?.emit('next_question');
  }, [loading, allDone]);

  const closeRound = useCallback(() => {
    socketRef.current?.emit('close_round');
  }, []);

  const resetGame = useCallback(() => {
    setQuestionNumber(0);
    setChoiceCounts([0, 0, 0, 0]);
    setLoading(false);
    setAllDone(false);
    setScreenPhase('setup');
    setParsedQuestions([]);
    setParseErrors([]);
    setInputText('');
    socketRef.current?.emit('reset_game');
  }, []);

  const handleParse = useCallback(() => {
    const { questions, errors } = parseQuestions(inputText);
    setParsedQuestions(questions);
    setParseErrors(errors);
  }, [inputText]);

  const handleConfirm = useCallback(() => {
    if (parsedQuestions.length === 0) return;
    const data = parsedQuestions.map(q => ({
      question: q.question,
      choices: q.choices,
      answer_index: q.answer_index,
    }));
    socketRef.current?.emit('set_questions', data);
  }, [parsedQuestions]);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        const base = cfg.publicUrl || window.location.origin;
        const url = `${base}/play`;
        setPlayUrl(url);
        import('qrcode').then((QRCode) => {
          QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#ffffff', light: '#00000000' } }).then(setQrDataUrl);
        });
      })
      .catch(() => {
        const url = `${window.location.origin}/play`;
        setPlayUrl(url);
        import('qrcode').then((QRCode) => {
          QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#ffffff', light: '#00000000' } }).then(setQrDataUrl);
        });
      });

    const socket = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity });
    socketRef.current = socket;

    socket.on('connect', () => { socket.emit('join', { token: '__screen__' }); });

    socket.on('state', (data: RoundStateDTO) => {
      setState((prev) => {
        if (data.phase === 'active' && (!prev || prev.questionId !== data.questionId)) {
          setQuestionNumber((n) => n + 1);
          setChoiceCounts([0, 0, 0, 0]);
          setScreenPhase('playing');
        }
        return data;
      });
      setLoading(false);
    });

    socket.on('answer_count', (data: any) => {
      setState((prev) => prev ? { ...prev, totalAnswers: data.totalAnswers, correctAnswers: data.correctAnswers, totalPlayers: data.totalPlayers } : prev);
      if (data.choiceCounts) setChoiceCounts(data.choiceCounts);
    });

    socket.on('questions_set', (data: { count: number }) => {
      setTotalQuestions(data.count);
      setScreenPhase('ready');
    });

    socket.on('no_more_questions', () => {
      setAllDone(true);
      setLoading(false);
    });

    socket.on('winner', () => {});

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); socketRef.current?.emit('next_question'); }
      if (e.code === 'Enter' || e.key === 'Enter') { e.preventDefault(); socketRef.current?.emit('close_round'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { socket.disconnect(); window.removeEventListener('keydown', handleKeyDown); };
  }, []);

  const isWaiting = !state || state.phase === 'waiting';
  const isActive = state?.phase === 'active';
  const isRevealed = state?.phase === 'revealed';
  const totalPlayers = state?.totalPlayers || 0;
  const maxCount = Math.max(...choiceCounts, 1);

  // ===== 事前準備画面 =====
  if (screenPhase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-black">
            <span className="text-amber-400">⚡</span> ４択早押しバトル
            <span className="text-lg font-normal text-slate-400 ml-4">— 事前準備</span>
          </h1>
        </div>

        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
          <div className="mb-4">
            <label className="text-slate-300 text-lg font-bold block mb-2">📝 クイズ問題を入力（1〜10問）</label>
            <p className="text-slate-500 text-sm mb-3">以下の形式で入力してください。改行してもOKです。</p>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Q1 日本で一番高い山は？, A1-1 富士山, A1-2 北岳, A1-3 奥穂高岳, A1-4 槍ヶ岳, 正解 A1-1,\nQ2 日本の首都は？, A2-1 大阪, A2-2 京都, A2-3 東京, A2-4 名古屋, 正解 A2-3,`}
              className="w-full h-48 bg-slate-800 border-2 border-slate-600 rounded-xl p-4 text-white text-base font-mono resize-y focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={handleParse}
            disabled={!inputText.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 mb-6 self-start"
          >
            🔍 内容を確認
          </button>

          {/* エラー表示 */}
          {parseErrors.length > 0 && (
            <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-4 mb-6">
              <p className="text-red-400 font-bold mb-2">⚠️ エラー</p>
              {parseErrors.map((err, i) => (
                <p key={i} className="text-red-300 text-sm">・{err}</p>
              ))}
            </div>
          )}

          {/* プレビュー */}
          {parsedQuestions.length > 0 && (
            <div className="mb-6">
              <p className="text-green-400 font-bold text-lg mb-3">✅ {parsedQuestions.length}問を解析しました</p>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {parsedQuestions.map((q, qi) => (
                  <div key={qi} className="bg-slate-800/80 rounded-xl p-4">
                    <p className="font-bold text-white mb-2">Q{qi + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.choices.map((c, ci) => (
                        <div
                          key={ci}
                          className={`text-sm px-3 py-1.5 rounded-lg ${
                            ci === q.answer_index
                              ? 'bg-green-600/40 text-green-300 font-bold ring-1 ring-green-500'
                              : 'bg-slate-700/60 text-slate-300'
                          }`}
                        >
                          {CHOICE_LABELS[ci]}. {c}
                          {ci === q.answer_index && ' ← 正解'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {parseErrors.length === 0 && parsedQuestions.length >= 1 && parsedQuestions.length <= 10 && (
                <button
                  onClick={handleConfirm}
                  className="mt-4 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xl font-black py-4 px-10 rounded-2xl transition-all hover:scale-105 active:scale-95"
                >
                  🎯 この内容でスタート
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== メイン画面（ready / playing） =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex flex-col">
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black">
              <span className="text-amber-400">⚡</span> ４択早押しバトル
            </h1>
            {screenPhase === 'playing' && (
              <button
                onClick={resetGame}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold py-1.5 px-4 rounded-lg transition-all"
              >
                ⏹ イベント終了
              </button>
            )}
          </div>
          <p className="text-slate-400 mt-1">
            接続中: <span className="text-white font-bold">{totalPlayers}</span>人
            {questionNumber > 0 && (
              <span className="ml-4">
                第<span className="text-amber-400 font-bold">{questionNumber}</span>問
                <span className="text-slate-500"> / 全{totalQuestions}問</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 rounded-xl p-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">参加はこちら↑</p>
            <p className="text-sm font-mono text-amber-400 break-all max-w-[200px]">{playUrl}</p>
          </div>
          {qrDataUrl && (<img src={qrDataUrl} alt="QR" className="w-40 h-40" />)}
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col justify-center">
        {isWaiting && (
          <div className="text-center animate-fade-in">
            <div className="text-8xl mb-8">⚡</div>
            <h2 className="text-5xl font-black mb-4">４択早押しバトル</h2>
            <p className="text-2xl text-slate-400 mb-2">
              QRコードを読み取って参加してください！
            </p>
            <p className="text-xl text-amber-400 mb-8">全{totalQuestions}問</p>
            <button
              onClick={requestNext}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-2xl font-black py-4 px-12 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {loading ? '準備中...' : '🌟 クイズスタート！'}
            </button>
            <p className="text-slate-500 mt-4 text-sm">スペースキーでもOK</p>
          </div>
        )}

        {(isActive || isRevealed) && state && (
          <div className="animate-fade-in">
            {/* 問題文 */}
            <div className="bg-slate-800/80 backdrop-blur rounded-3xl p-8 mb-6">
              <p className="text-4xl font-black leading-relaxed">{state.question}</p>
            </div>

            {/* 選択肢 + リアルタイムバー */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {state.choices.map((choice, i) => {
                let extra = '';
                if (isRevealed && state.answer_index !== null) {
                  extra = i === state.answer_index ? ' ring-4 ring-green-400 !bg-green-500/50 scale-105' : ' opacity-40';
                }
                const count = choiceCounts[i] || 0;
                const pct = state.totalAnswers > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={i} className={`border-2 rounded-2xl p-5 transition-all duration-500 ${CHOICE_COLORS[i]}${extra}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-2xl font-black opacity-60 mr-3">{CHOICE_LABELS[i]}</span>
                        <span className="text-2xl font-bold">{choice}</span>
                      </div>
                      <span className="text-3xl font-black tabular-nums">
                        {count}<span className="text-lg text-slate-400 ml-1">人</span>
                      </span>
                    </div>
                    <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ease-out ${BAR_COLORS[i]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ステータスバー */}
            <div className="flex items-center justify-between">
              <div className="bg-slate-800/60 rounded-xl px-6 py-3">
                <span className="text-slate-400">回答: </span>
                <span className="text-3xl font-black text-white">{state.totalAnswers}</span>
                <span className="text-slate-400"> / {state.totalPlayers}人</span>
              </div>

              {isRevealed && (
                <div className="bg-slate-800/60 rounded-xl px-6 py-3">
                  <span className="text-slate-400">正答率: </span>
                  <span className="text-3xl font-black text-green-400">
                    {state.totalAnswers > 0 ? Math.round((state.correctAnswers / state.totalAnswers) * 100) : 0}%
                  </span>
                  <span className="text-slate-400 ml-2">({state.correctAnswers}/{state.totalAnswers})</span>
                </div>
              )}

              {isActive && (
                <button onClick={closeRound} className="bg-rose-600 hover:bg-rose-500 text-white text-xl font-black py-3 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 animate-pulse">
                  🔔 締め切る
                </button>
              )}

              {isRevealed && !allDone && (
                <button onClick={requestNext} disabled={loading} className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-xl font-black py-3 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                  {loading ? '準備中...' : '次の問題 ▶'}
                </button>
              )}

              {isRevealed && allDone && (
                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 text-xl font-black py-3 px-8 rounded-2xl">
                  🎉 全問終了！
                </div>
              )}
            </div>

            {/* 勝者表示 */}
            {isRevealed && state.winnerName && (
              <div className="mt-6 text-center animate-bounce-in">
                <div className="inline-block bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-3xl p-8">
                  <p className="text-2xl text-amber-900 font-bold">🏆 最速正解！</p>
                  <p className="text-6xl font-black text-amber-900 mt-2">{state.winnerName}</p>
                </div>
              </div>
            )}
            {isRevealed && !state.winnerName && (
              <div className="mt-6 text-center animate-bounce-in">
                <div className="inline-block bg-slate-700 rounded-3xl p-8">
                  <p className="text-3xl font-bold text-slate-300">😭 正解者なし！</p>
                </div>
              </div>
            )}

            {/* 解説 */}
            {isRevealed && state.explanation && (
              <div className="mt-4 bg-slate-800/60 rounded-2xl p-6 animate-fade-in">
                <p className="text-xl text-slate-200">💡 {state.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
