'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Question {
  question: string;
  choices: [string, string, string, string];
  answer_index: number;
}

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Question>({
    question: '',
    choices: ['', '', '', ''],
    answer_index: 0,
  });
  const [message, setMessage] = useState('');
  const [csvText, setCsvText] = useState('');
  const [mode, setMode] = useState<'form' | 'csv'>('csv');
  const socketRef = useRef<Socket | null>(null);

  // Socket.IO接続
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  // クイズ一覧を取得
  const loadQuestions = async () => {
    try {
      const res = await fetch('/api/admin/questions');
      const data = await res.json();
      setQuestions(data.questions);
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // クイズを保存
  const saveQuestions = async (newQuestions: Question[]) => {
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: newQuestions }),
      });
      if (res.ok) {
        setMessage('保存しました！サーバーに反映中...');

        // サーバーにクイズデータの再読み込みを指示
        socketRef.current?.emit('reload_questions');

        setTimeout(() => setMessage(''), 3000);
        await loadQuestions();
      } else {
        setMessage('保存に失敗しました');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setMessage('保存に失敗しました');
    }
  };

  // 新規追加または編集
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!formData.question.trim()) {
      alert('問題文を入力してください');
      return;
    }
    if (formData.choices.some(c => !c.trim())) {
      alert('すべての選択肢を入力してください');
      return;
    }

    const newQuestions = [...questions];
    if (editingIndex !== null) {
      // 編集
      newQuestions[editingIndex] = formData;
    } else {
      // 新規追加
      newQuestions.push(formData);
    }

    saveQuestions(newQuestions);
    resetForm();
  };

  // 削除
  const handleDelete = (index: number) => {
    if (!confirm('この問題を削除しますか？')) return;
    const newQuestions = questions.filter((_, i) => i !== index);
    saveQuestions(newQuestions);
    if (editingIndex === index) resetForm();
  };

  // 編集開始
  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData({ ...questions[index] });
  };

  // フォームリセット
  const resetForm = () => {
    setEditingIndex(null);
    setFormData({
      question: '',
      choices: ['', '', '', ''],
      answer_index: 0,
    });
  };

  // CSV一括登録
  const handleCsvImport = async () => {
    try {
      const lines = csvText.trim().split('\n');
      const newQuestions: Question[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        // ヘッダー行をスキップ
        if (line.startsWith('問題文') || line.startsWith('question')) continue;

        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 6) {
          alert(`${i + 1}行目: 形式が正しくありません（6列必要です）`);
          return;
        }

        const [question, choice1, choice2, choice3, choice4, answerNumStr] = parts;
        const answerNum = parseInt(answerNumStr);

        if (isNaN(answerNum) || answerNum < 1 || answerNum > 4) {
          alert(`${i + 1}行目: 正解番号は1〜4の数字で指定してください`);
          return;
        }

        newQuestions.push({
          question,
          choices: [choice1, choice2, choice3, choice4],
          answer_index: answerNum - 1,
        });
      }

      if (newQuestions.length === 0) {
        alert('有効な問題が見つかりませんでした');
        return;
      }

      await saveQuestions(newQuestions);
      setCsvText('');
      setMessage(`${newQuestions.length}問を登録しました！`);
    } catch (err) {
      console.error('CSV import failed:', err);
      alert('CSV読み込みに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">🎯 クイズ管理画面</h1>
          <p className="text-slate-400">クイズの追加・編集・削除ができます</p>
          <div className="mt-4 flex gap-4">
            <a href="/screen" className="text-amber-400 hover:underline">→ スクリーン画面</a>
            <a href="/play" className="text-amber-400 hover:underline">→ プレイ画面</a>
          </div>
        </div>

        {message && (
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg mb-4 animate-fade-in">
            {message}
          </div>
        )}

        {/* モード切替 */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode('csv')}
            className={`px-6 py-2 rounded-lg font-bold transition ${
              mode === 'csv'
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            CSV一括入力
          </button>
          <button
            onClick={() => setMode('form')}
            className={`px-6 py-2 rounded-lg font-bold transition ${
              mode === 'form'
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            フォーム入力
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側: CSV入力 or フォーム */}
          {mode === 'csv' ? (
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">CSV一括入力</h2>
              <p className="text-sm text-slate-400 mb-4">
                CSV形式でクイズを一括登録できます。1行1問の形式で入力してください。
              </p>

              <div className="bg-slate-700 rounded-lg p-4 mb-4 text-sm">
                <p className="font-bold mb-2">📝 形式:</p>
                <code className="text-green-400">問題文,選択肢1,選択肢2,選択肢3,選択肢4,正解番号</code>
                <p className="mt-3 font-bold mb-2">✨ 例:</p>
                <code className="text-amber-400 block">日本で一番高い山は？,富士山,北岳,槍ヶ岳,立山,1</code>
                <code className="text-amber-400 block">日本の首都はどこ？,東京,大阪,京都,名古屋,1</code>
              </div>

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full bg-slate-700 rounded-lg p-4 text-white font-mono text-sm"
                rows={12}
                placeholder="日本で一番高い山は？,富士山,北岳,槍ヶ岳,立山,1&#10;日本の首都はどこ？,東京,大阪,京都,名古屋,1"
              />

              <button
                onClick={handleCsvImport}
                disabled={!csvText.trim()}
                className="w-full mt-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:text-slate-400 text-slate-900 font-bold py-3 rounded-lg transition"
              >
                一括登録（現在の内容を上書き）
              </button>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingIndex !== null ? '問題を編集' : '新しい問題を追加'}
              </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 問題文 */}
              <div>
                <label className="block text-sm font-bold mb-2">問題文</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full bg-slate-700 rounded-lg p-3 text-white"
                  rows={3}
                  placeholder="問題文を入力..."
                />
              </div>

              {/* 選択肢 */}
              {formData.choices.map((choice, i) => (
                <div key={i}>
                  <label className="block text-sm font-bold mb-2">
                    選択肢 {i + 1}
                    {formData.answer_index === i && (
                      <span className="ml-2 text-green-400">✓ 正解</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => {
                        const newChoices = [...formData.choices] as [string, string, string, string];
                        newChoices[i] = e.target.value;
                        setFormData({ ...formData, choices: newChoices });
                      }}
                      className="flex-1 bg-slate-700 rounded-lg p-3 text-white"
                      placeholder={`選択肢${i + 1}を入力...`}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, answer_index: i })}
                      className={`px-4 rounded-lg font-bold ${
                        formData.answer_index === i
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                    >
                      正解
                    </button>
                  </div>
                </div>
              ))}

              {/* ボタン */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-lg transition"
                >
                  {editingIndex !== null ? '更新' : '追加'}
                </button>
                {editingIndex !== null && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded-lg transition"
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </form>
            </div>
          )}

          {/* 右側: クイズ一覧 */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">
              登録済みクイズ ({questions.length}問)
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {questions.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  まだクイズがありません
                </p>
              ) : (
                questions.map((q, i) => (
                  <div
                    key={i}
                    className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold flex-1">
                        {i + 1}. {q.question}
                      </p>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(i)}
                          className="text-amber-400 hover:text-amber-300 text-sm font-bold"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(i)}
                          className="text-red-400 hover:text-red-300 text-sm font-bold"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-slate-300 space-y-1">
                      {q.choices.map((choice, j) => (
                        <div key={j} className="flex items-center gap-2">
                          {q.answer_index === j && (
                            <span className="text-green-400">✓</span>
                          )}
                          <span className="text-slate-400">{j + 1}.</span>
                          <span>{choice}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
