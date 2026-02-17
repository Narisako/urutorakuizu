'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoundStateDTO } from '@/lib/types';

const CHOICE_COLORS = [
  'choice-btn-a',
  'choice-btn-b',
  'choice-btn-c',
  'choice-btn-d',
];
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

export default function PlayPage() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState<string>('');
  const [state, setState] = useState<RoundStateDTO | null>(null);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 勝者点滅停止用
  const stopFlash = useCallback(() => {
    setIsWinner(false);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

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

    socket.on('joined', (data) => {
      localStorage.setItem('quiz_token', data.token);
      setName(data.name);
    });

    socket.on('state', (data: RoundStateDTO) => {
      setState(data);
      // 新しい問題が来たら回答リセット
      setMyAnswer((prev) => {
        // questionIdが変わったらリセット
        return prev !== null && data.phase === 'active' ? null : prev;
      });
      if (data.phase === 'active') {
        setMyAnswer(null);
        stopFlash();
      }
    });

    socket.on('winner', (data) => {
      const myToken = localStorage.getItem('quiz_token');
      if (data.token === myToken) {
        setIsWinner(true);
        // 5秒後に点滅停止
        flashTimerRef.current = setTimeout(() => setIsWinner(false), 5000);
      }
    });

    socket.on('error', (data) => {
      alert(data.message);
    });

    return () => {
      socket.disconnect();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [stopFlash]);

  const handleAnswer = (choiceIndex: number) => {
    if (myAnswer !== null || !state || state.phase !== 'active') return;
    setMyAnswer(choiceIndex);
    socketRef.current?.emit('answer', {
      questionId: state.questionId,
      choiceIndex,
    });
  };

  // ===== レンダリング =====

  // 勝者点滅オーバーレイ
  if (isWinner) {
    return (
      <div className="min-h-screen animate-flash-red flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-8xl mb-4">🏆</div>
          <h1 className="text-4xl font-black text-white drop-shadow-lg">
            正解！一番乗り！
          </h1>
          <p className="text-2xl mt-4 font-bold text-white drop-shadow">
            {name}
          </p>
        </div>
      </div>
    );
  }

  // 接続待ち
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚡</div>
          <p className="text-xl text-slate-300">接続中...</p>
        </div>
      </div>
    );
  }

  // 待機中
  if (!state || state.phase === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-6">🦌</div>
          <h1 className="text-2xl font-bold mb-2">岩手クイズバトル</h1>
          <div className="bg-slate-800 rounded-2xl p-6 mt-4">
            <p className="text-slate-400 text-sm">あなたの名前</p>
            <p className="text-3xl font-black text-amber-400 mt-1">{name}</p>
          </div>
          <p className="text-slate-400 mt-6 animate-pulse">次の問題を待っています...</p>
        </div>
      </div>
    );
  }

  // 問題表示中 / 結果表示
  const isRevealed = state.phase === 'revealed';
  const hasAnswered = myAnswer !== null;

  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-amber-400 font-bold text-lg">{name}</span>
        <span className="text-slate-400 text-sm">
          {state.totalAnswers}/{state.totalPlayers}人回答
        </span>
      </div>

      {/* 問題文 */}
      <div className="bg-slate-800 rounded-2xl p-5 mb-6">
        <p className="text-lg font-bold leading-relaxed">{state.question}</p>
      </div>

      {/* 選択肢 */}
      <div className="flex-1 flex flex-col gap-3">
        {state.choices.map((choice, i) => {
          let extra = '';
          if (isRevealed && state.answer_index !== null) {
            if (i === state.answer_index) extra = ' choice-btn-correct';
            else extra = ' choice-btn-wrong';
          }
          if (hasAnswered && !isRevealed && i === myAnswer) {
            extra = ' ring-4 ring-white/60 scale-105';
          }
          const disabled = hasAnswered || isRevealed;

          return (
            <button
              key={i}
              className={`choice-btn ${CHOICE_COLORS[i]}${extra}${disabled ? ' choice-btn-disabled' : ''}`}
              onClick={() => handleAnswer(i)}
              disabled={disabled}
            >
              <span className="mr-3 opacity-70">{CHOICE_LABELS[i]}.</span>
              {choice}
              {hasAnswered && i === myAnswer && (
                <span className="ml-2">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 回答済みメッセージ */}
      {hasAnswered && !isRevealed && (
        <div className="text-center mt-4 text-slate-400 animate-pulse">
          回答済み！結果を待っています...
        </div>
      )}

      {/* 結果表示 */}
      {isRevealed && (
        <div className="mt-4 bg-slate-800 rounded-2xl p-4 animate-fade-in">
          {state.winnerName ? (
            <div className="text-center">
              <p className="text-amber-400 font-bold">
                🏆 最速正解: {state.winnerName}
              </p>
            </div>
          ) : (
            <p className="text-center text-slate-400">正解者なし！</p>
          )}
          {state.explanation && (
            <p className="text-sm text-slate-300 mt-2">💡 {state.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
