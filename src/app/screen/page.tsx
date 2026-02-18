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

export default function ScreenPage() {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RoundStateDTO | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [playUrl, setPlayUrl] = useState<string>('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  const [choiceCounts, setChoiceCounts] = useState<number[]>([0, 0, 0, 0]);

  const requestNext = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setChoiceCounts([0, 0, 0, 0]);
    socketRef.current?.emit('next_question');
  }, [loading]);

  const closeRound = useCallback(() => {
    socketRef.current?.emit('close_round');
  }, []);

  useEffect(() => {
    // PUBLIC_URLをサーバーから取得、なければブラウザのoriginを使用
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        const base = cfg.publicUrl || window.location.origin;
        const url = `${base}/play`;
        setPlayUrl(url);
        import('qrcode').then((QRCode) => {
          QRCode.toDataURL(url, {
            width: 800,
            margin: 2,
            color: { dark: '#ffffff', light: '#00000000' },
          }).then(setQrDataUrl);
        });
      })
      .catch(() => {
        const url = `${window.location.origin}/play`;
        setPlayUrl(url);
        import('qrcode').then((QRCode) => {
          QRCode.toDataURL(url, {
            width: 800,
            margin: 2,
            color: { dark: '#ffffff', light: '#00000000' },
          }).then(setQrDataUrl);
        });
      });

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { token: '__screen__' });
    });

    socket.on('state', (data: RoundStateDTO) => {
      setState((prev) => {
        if (data.phase === 'active' && (!prev || prev.questionId !== data.questionId)) {
          setQuestionNumber((n) => n + 1);
          setChoiceCounts([0, 0, 0, 0]);
        }
        return data;
      });
      setLoading(false);
    });

    socket.on('answer_count', (data: any) => {
      setState((prev) => prev ? {
        ...prev,
        totalAnswers: data.totalAnswers,
        correctAnswers: data.correctAnswers,
        totalPlayers: data.totalPlayers,
      } : prev);
      if (data.choiceCounts) {
        setChoiceCounts(data.choiceCounts);
      }
    });

    socket.on('winner', () => {});

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        socketRef.current?.emit('next_question');
      }
      if (e.code === 'Enter' || e.key === 'Enter') {
        e.preventDefault();
        socketRef.current?.emit('close_round');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      socket.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ===== レンダリング =====
  const isWaiting = !state || state.phase === 'waiting';
  const isActive = state?.phase === 'active';
  const isRevealed = state?.phase === 'revealed';
  const totalPlayers = state?.totalPlayers || 0;
  const maxCount = Math.max(...choiceCounts, 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex flex-col">
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-black">
            <span className="text-amber-400">🦌</span> 岩手クイズバトル
          </h1>
          <p className="text-slate-400 mt-1">
            接続中: <span className="text-white font-bold">{totalPlayers}</span>人
            {questionNumber > 0 && (
              <span className="ml-4">第<span className="text-amber-400 font-bold">{questionNumber}</span>問</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 rounded-xl p-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">参加はこちら↑</p>
            <p className="text-sm font-mono text-amber-400 break-all max-w-[200px]">{playUrl}</p>
          </div>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR" className="w-80 h-80" />
          )}
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col justify-center">
        {isWaiting && (
          <div className="text-center animate-fade-in">
            <div className="text-8xl mb-8">🦌</div>
            <h2 className="text-5xl font-black mb-4">岩手クイズバトル</h2>
            <p className="text-2xl text-slate-400 mb-8">
              QRコードを読み取って参加してください！
            </p>
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
              <p className="text-4xl font-black leading-relaxed">
                {state.question}
              </p>
            </div>

            {/* 選択肢 + リアルタイムバー */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {state.choices.map((choice, i) => {
                let extra = '';
                if (isRevealed && state.answer_index !== null) {
                  if (i === state.answer_index) {
                    extra = ' ring-4 ring-green-400 !bg-green-500/50 scale-105';
                  } else {
                    extra = ' opacity-40';
                  }
                }
                const count = choiceCounts[i] || 0;
                const pct = state.totalAnswers > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div
                    key={i}
                    className={`border-2 rounded-2xl p-5 transition-all duration-500 ${CHOICE_COLORS[i]}${extra}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-2xl font-black opacity-60 mr-3">{CHOICE_LABELS[i]}</span>
                        <span className="text-2xl font-bold">{choice}</span>
                      </div>
                      <span className="text-3xl font-black tabular-nums">
                        {count}
                        <span className="text-lg text-slate-400 ml-1">人</span>
                      </span>
                    </div>
                    {/* バー */}
                    <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ease-out ${BAR_COLORS[i]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ステータスバー */}
            <div className="flex items-center justify-between">
              {/* 回答数 */}
              <div className="bg-slate-800/60 rounded-xl px-6 py-3">
                <span className="text-slate-400">回答: </span>
                <span className="text-3xl font-black text-white">{state.totalAnswers}</span>
                <span className="text-slate-400"> / {state.totalPlayers}人</span>
              </div>

              {/* 正答率（revealed時） */}
              {isRevealed && (
                <div className="bg-slate-800/60 rounded-xl px-6 py-3">
                  <span className="text-slate-400">正答率: </span>
                  <span className="text-3xl font-black text-green-400">
                    {state.totalAnswers > 0
                      ? Math.round((state.correctAnswers / state.totalAnswers) * 100)
                      : 0}%
                  </span>
                  <span className="text-slate-400 ml-2">
                    ({state.correctAnswers}/{state.totalAnswers})
                  </span>
                </div>
              )}

              {/* 締め切るボタン（active時） */}
              {isActive && (
                <button
                  onClick={closeRound}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xl font-black py-3 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 animate-pulse"
                >
                  🔔 締め切る
                </button>
              )}

              {/* 次の問題ボタン（revealed時） */}
              {isRevealed && (
                <button
                  onClick={requestNext}
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-xl font-black py-3 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {loading ? '準備中...' : '次の問題 ▶'}
                </button>
              )}
            </div>

            {/* 勝者表示 */}
            {isRevealed && state.winnerName && (
              <div className="mt-6 text-center animate-bounce-in">
                <div className="inline-block bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-3xl p-8">
                  <p className="text-2xl text-amber-900 font-bold">🏆 最速正解！</p>
                  <p className="text-6xl font-black text-amber-900 mt-2">
                    {state.winnerName}
                  </p>
                </div>
              </div>
            )}

            {isRevealed && !state.winnerName && (
              <div className="mt-6 text-center animate-bounce-in">
                <div className="inline-block bg-slate-700 rounded-3xl p-8">
                  <p className="text-3xl font-bold text-slate-300">
                    😭 正解者なし！
                  </p>
                </div>
              </div>
            )}

            {/* 解説 */}
            {isRevealed && state.explanation && (
              <div className="mt-4 bg-slate-800/60 rounded-2xl p-6 animate-fade-in">
                <p className="text-xl text-slate-200">
                  💡 {state.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
