'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoundStateDTO } from '@/lib/types';

const CHOICE_COLORS = ['choice-btn-a', 'choice-btn-b', 'choice-btn-c', 'choice-btn-d'];
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

export default function PlayPage() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [myToken, setMyToken] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState<RoundStateDTO | null>(null);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [flashDoneForQ, setFlashDoneForQ] = useState('');

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const token = localStorage.getItem('quiz_token') || undefined;
      socket.emit('join', { token });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('joined', (data: { token: string; name: string }) => {
      localStorage.setItem('quiz_token', data.token);
      setMyToken(data.token);
      setName(data.name);
    });

    socket.on('state', (data: RoundStateDTO) => {
      setState(data);
      if (data.phase === 'active') setMyAnswer(null);
    });

    socket.on('answer_count', (data: any) => {
      setState(prev => prev ? { ...prev, totalAnswers: data.totalAnswers, correctAnswers: data.correctAnswers, totalPlayers: data.totalPlayers } : prev);
    });

    socket.on('error', (data: { message: string }) => alert(data.message));

    return () => { socket.disconnect(); };
  }, []);

  // レンダリング時に勝者判定（myTokenはReact stateで管理）
  const isWinner = !!(state?.phase === 'revealed' && state.winnerToken && myToken && state.winnerToken === myToken);
  const showFlash = isWinner && flashDoneForQ !== state?.questionId;

  // 勝者確定て6秒後に点滅停止
  useEffect(() => {
    if (!isWinner || !state?.questionId) return;
    if (flashDoneForQ === state.questionId) return;
    const timer = setTimeout(() => setFlashDoneForQ(state.questionId), 6000);
    return () => clearTimeout(timer);
  }, [isWinner, state?.questionId, flashDoneForQ]);

  const handleAnswer = (idx: number) => {
    if (myAnswer !== null || !state || state.phase !== 'active') return;
    setMyAnswer(idx);
    socketRef.current?.emit('answer', { questionId: state.questionId, choiceIndex: idx });
  };

  // ===== レンダリング =====
  if (showFlash) {
    return (
      <div className="min-h-screen animate-flash-red flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-8xl mb-4">🏆</div>
          <h1 className="text-4xl font-black text-white drop-shadow-lg">正解！一番乗り！</h1>
          <p className="text-2xl mt-4 font-bold text-white drop-shadow">{name}</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (<div className="min-h-screen flex items-center justify-center p-4"><div className="text-center"><div className="animate-spin text-4xl mb-4">⚡</div><p className="text-xl text-slate-300">接続中...</p></div></div>);
  }

  if (!state || state.phase === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-6">🎯</div>
          <h1 className="text-2xl font-bold mb-2">4択早押しクイズバトル</h1>
          <div className="bg-slate-800 rounded-2xl p-6 mt-4">
            <p className="text-slate-400 text-sm">あなたの名前</p>
            <p className="text-3xl font-black text-amber-400 mt-1">{name}</p>
          </div>
          <p className="text-slate-400 mt-6 animate-pulse">次の問題を待っています...</p>
        </div>
      </div>
    );
  }

  const isRevealed = state.phase === 'revealed';
  const hasAnswered = myAnswer !== null;

  return (
    <div className="min-h-screen p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <span className="text-amber-400 font-bold text-lg">{name}</span>
        <span className="text-slate-400 text-sm">{state.totalAnswers}/{state.totalPlayers}人回答</span>
      </div>
      <div className="bg-slate-800 rounded-2xl p-5 mb-6">
        <p className="text-lg font-bold leading-relaxed">{state.question}</p>
      </div>
      <div className="flex-1 flex flex-col gap-3">
        {state.choices.map((choice, i) => {
          let extra = '';
          if (isRevealed && state.answer_index !== null) extra = i === state.answer_index ? ' choice-btn-correct' : ' choice-btn-wrong';
          if (hasAnswered && !isRevealed && i === myAnswer) extra = ' ring-4 ring-white/60 scale-105';
          return (
            <button key={i} className={`choice-btn ${CHOICE_COLORS[i]}${extra}${hasAnswered || isRevealed ? ' choice-btn-disabled' : ''}`} onClick={() => handleAnswer(i)} disabled={hasAnswered || isRevealed}>
              <span className="mr-3 opacity-70">{CHOICE_LABELS[i]}.</span>{choice}{hasAnswered && i === myAnswer && <span className="ml-2">✓</span>}
            </button>
          );
        })}
      </div>
      {hasAnswered && !isRevealed && <div className="text-center mt-4 text-slate-400 animate-pulse">回答済み！結果を待っています...</div>}
      {isRevealed && (
        <div className="mt-4 bg-slate-800 rounded-2xl p-4 animate-fade-in">
          {state.winnerName ? <div className="text-center"><p className="text-amber-400 font-bold">🏆 最速正解: {state.winnerName}</p></div> : <p className="text-center text-slate-400">正解者なし！</p>}
          {state.explanation && <p className="text-sm text-slate-300 mt-2">💡 {state.explanation}</p>}
        </div>
      )}
    </div>
  );
}
