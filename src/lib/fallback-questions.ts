// フォールバック用の内蔵クイズ（LLM生成失敗時に使用）
import { QuizQuestion } from './types';
import { v4 as uuidv4 } from 'uuid';

const FALLBACK_RAW = [
  {
    question: 'スクラムで、スプリントの長さとして推奨される最大期間は？',
    choices: ['1ヶ月（4週間）', '2ヶ月', '2週間', '1週間'],
    answer_index: 0,
    explanation: 'スクラムガイドでは、スプリントは1ヶ月以内と定められています。実際は1〜2週間が多いです。',
    difficulty: 'easy' as const,
    category: 'スクラム',
  },
  {
    question: 'スクラムの3つの役割に含まれないのはどれ？',
    choices: ['プロジェクトマネージャー', 'プロダクトオーナー', 'スクラムマスター', '開発者'],
    answer_index: 0,
    explanation: 'スクラムの3つの役割はプロダクトオーナー、スクラムマスター、開発者です。PMは存在しません。',
    difficulty: 'easy' as const,
    category: 'スクラム',
  },
  {
    question: 'アジャイルソフトウェア開発宣言が発表された年は？',
    choices: ['2001年', '1999年', '2005年', '2010年'],
    answer_index: 0,
    explanation: 'アジャイルソフトウェア開発宣言は2001年にユタ州スノーバードで17人の開発者によって作られました。',
    difficulty: 'normal' as const,
    category: '歴史',
  },
  {
    question: 'アジャイル宣言の4つの価値のうち、左側（重視する方）に含まれないのは？',
    choices: ['包括的なドキュメント', '個人と対話', '動くソフトウェア', '変化への対応'],
    answer_index: 0,
    explanation: '「包括的なドキュメントよりも動くソフトウェアを」がアジャイル宣言の価値の一つです。',
    difficulty: 'normal' as const,
    category: 'アジャイル宣言',
  },
  {
    question: 'デイリースクラム（デイリースタンドアップ）の推奨時間は？',
    choices: ['15分以内', '30分以内', '1時間以内', '時間制限なし'],
    answer_index: 0,
    explanation: 'デイリースクラムは15分以内のタイムボックスで行います。短く、集中して！',
    difficulty: 'easy' as const,
    category: 'スクラム',
  },
  {
    question: 'カンバンの「WIP制限」の「WIP」は何の略？',
    choices: ['Work In Progress', 'Work In Process', 'Weekly Iteration Plan', 'Work Item Priority'],
    answer_index: 0,
    explanation: 'WIPはWork In Progress（仕掛かり中の作業）の略。同時進行の作業数を制限して流れを改善します。',
    difficulty: 'easy' as const,
    category: 'カンバン',
  },
  {
    question: 'スプリントレトロスペクティブの目的は？',
    choices: ['チームの改善点を振り返る', 'プロダクトバックログを整理する', '次のスプリントの計画を立てる', 'ステークホルダーに成果を見せる'],
    answer_index: 0,
    explanation: 'レトロスペクティブはチームが自分たちのプロセスを振り返り、改善する場です。',
    difficulty: 'easy' as const,
    category: 'スクラム',
  },
  {
    question: 'プロダクトバックログの優先順位付けの最終責任者は？',
    choices: ['プロダクトオーナー', 'スクラムマスター', '開発チーム全員', 'ステークホルダー'],
    answer_index: 0,
    explanation: 'プロダクトバックログの管理と優先順位付けはプロダクトオーナーの責任です。',
    difficulty: 'easy' as const,
    category: 'スクラム',
  },
  {
    question: 'ユーザーストーリーの一般的な書き方は？',
    choices: ['〇〇として、△△したい、なぜなら□□だから', '〇〇の機能を△△の期限までに実装する', '〇〇のバグを修正し△△をテストする', '〇〇の画面に△△のボタンを追加する'],
    answer_index: 0,
    explanation: '「As a ○○, I want △△, so that □□」の形式がユーザーストーリーの定番フォーマットです。',
    difficulty: 'easy' as const,
    category: 'プラクティス',
  },
  {
    question: 'ペアプログラミングで、キーボードを操作する人の役割名は？',
    choices: ['ドライバー', 'ナビゲーター', 'コーダー', 'オペレーター'],
    answer_index: 0,
    explanation: 'ペアプロでは「ドライバー」がコードを書き、「ナビゲーター」が方向性を考えます。',
    difficulty: 'easy' as const,
    category: 'XP',
  },
  {
    question: 'スクラムのイベントに含まれないのはどれ？',
    choices: ['リリース計画ミーティング', 'スプリントプランニング', 'スプリントレビュー', 'デイリースクラム'],
    answer_index: 0,
    explanation: 'スクラムの5つのイベントはスプリント、スプリントプランニング、デイリースクラム、スプリントレビュー、レトロスペクティブです。',
    difficulty: 'normal' as const,
    category: 'スクラム',
  },
  {
    question: 'TDD（テスト駆動開発）の正しい手順は？',
    choices: ['Red → Green → Refactor', 'Green → Red → Refactor', 'Refactor → Red → Green', 'Red → Refactor → Green'],
    answer_index: 0,
    explanation: 'まずテストを書いて失敗させ（Red）、最小限のコードで通し（Green）、リファクタリングします。',
    difficulty: 'normal' as const,
    category: 'XP',
  },
  {
    question: 'ベロシティとは何を測る指標？',
    choices: ['スプリントで完了したストーリーポイントの合計', '1日あたりのコミット数', 'バグの修正速度', 'デプロイの頻度'],
    answer_index: 0,
    explanation: 'ベロシティはスプリントごとに完了したストーリーポイントの合計で、チームの予測に使います。',
    difficulty: 'easy' as const,
    category: 'メトリクス',
  },
  {
    question: '「完成の定義（Definition of Done）」を決める主な目的は？',
    choices: ['成果物の品質基準を明確にする', 'スプリントの期間を決める', 'チームメンバーの評価をする', 'バックログの優先順位を決める'],
    answer_index: 0,
    explanation: 'DoDはインクリメントが「完成」とみなされる基準を共有し、品質を担保するためのものです。',
    difficulty: 'normal' as const,
    category: 'スクラム',
  },
  {
    question: 'CI/CDの「CI」は何の略？',
    choices: ['Continuous Integration', 'Continuous Improvement', 'Code Inspection', 'Change Implementation'],
    answer_index: 0,
    explanation: 'CIはContinuous Integration（継続的インテグレーション）。コードを頻繁に統合してビルド・テストします。',
    difficulty: 'easy' as const,
    category: 'DevOps',
  },
  {
    question: 'スクラムマスターの主な役割は？',
    choices: ['チームの障害を取り除きプロセスを改善する', 'チームにタスクを割り当てる', 'プロダクトの仕様を決める', 'コードレビューを承認する'],
    answer_index: 0,
    explanation: 'スクラムマスターはサーバントリーダーとして、チームがスクラムを効果的に実践できるよう支援します。',
    difficulty: 'easy' as const,
    category: 'スクラム',
  },
  {
    question: 'XP（エクストリームプログラミング）の提唱者は？',
    choices: ['ケント・ベック', 'ジェフ・サザーランド', 'マーティン・ファウラー', 'ロバート・C・マーティン'],
    answer_index: 0,
    explanation: 'XPはケント・ベックが1990年代後半に提唱したアジャイル開発手法です。',
    difficulty: 'normal' as const,
    category: '歴史',
  },
  {
    question: 'スプリントレビューで行うことは？',
    choices: ['完成したインクリメントをステークホルダーに見せてフィードバックを得る', 'チーム内の人間関係を改善する', '次のスプリントのタスクを見積もる', 'バグの原因を分析する'],
    answer_index: 0,
    explanation: 'スプリントレビューはステークホルダーにインクリメントをデモし、フィードバックを得る場です。',
    difficulty: 'easy' as const,
    category: 'スクラム',
  },
  {
    question: 'モブプログラミングの特徴は？',
    choices: ['チーム全員が1台のPCで一緒にコードを書く', '全員が別々のPCで同じファイルを編集する', '1人が全てのコードを書き他はレビューする', '2人1組で交代しながらコードを書く'],
    answer_index: 0,
    explanation: 'モブプログラミングはチーム全員が同じ画面・同じ問題に取り組むプラクティスです。',
    difficulty: 'normal' as const,
    category: 'プラクティス',
  },
  {
    question: 'アジャイル開発でよく使われる「YAGNI」の意味は？',
    choices: ['You Aren\'t Gonna Need It（それは必要にならない）', 'You Already Got New Ideas（新しいアイデアがある）', 'Yes, Agile Generates New Income（アジャイルは収益を生む）', 'Your Application Gets No Issues（アプリに問題はない）'],
    answer_index: 0,
    explanation: 'YAGNIは「今必要でない機能を先に作るな」というXPの原則です。',
    difficulty: 'normal' as const,
    category: 'XP',
  },
];

let fallbackIndex = 0;

function shuffleChoices(raw: typeof FALLBACK_RAW[number]): { choices: string[]; answer_index: number } {
  const indices = [0, 1, 2, 3];
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const choices = indices.map(i => raw.choices[i]);
  const answer_index = indices.indexOf(raw.answer_index);
  return { choices, answer_index };
}

export function getFallbackQuestion(): QuizQuestion {
  const raw = FALLBACK_RAW[fallbackIndex % FALLBACK_RAW.length];
  fallbackIndex++;
  const { choices, answer_index } = shuffleChoices(raw);
  return {
    ...raw,
    choices,
    answer_index,
    questionId: uuidv4(),
  };
}

export const FALLBACK_COUNT = FALLBACK_RAW.length;
