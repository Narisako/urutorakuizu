// フォールバック用の内蔵クイズ（LLM生成失敗時に使用）
import { QuizQuestion } from './types';
import { v4 as uuidv4 } from 'uuid';

const FALLBACK_RAW = [
  {
    question: '榎本さんは「ポイ活」が好きです。さて、「ポイ活」とは何をする活動でしょう？',
    choices: ['ポイントカードを集める活動', '現金を使わずに生活する活動', 'ポイントを効率よく貯めて活用する活動', 'ポイントの履歴を眺めて楽しむ活動'],
    answer_index: 2,
    explanation: '正解は「ポイントを効率よく貯めて活用する活動」。榎本さんはポイ活の達人です！',
    difficulty: 'normal' as const,
    category: '榎本さん',
  },
  {
    question: 'ポイ活好きで、マイルの達人でもある榎本さん。さて、榎本さんが主にためているマイルはどれでしょう？',
    choices: ['ANAマイレージクラブ', 'JALマイレージバンク', 'ユナイテッド航空（MileagePlus）', 'デルタ スカイマイル'],
    answer_index: 2,
    explanation: '正解はユナイテッド航空のMileagePlus。国内線ではなく海外系マイルを攻めるあたりがマイル上級者の証！',
    difficulty: 'normal' as const,
    category: '榎本さん',
  },
  {
    question: '榎本さんは、自分の旅行のためにプロが使う“あるシステム”の操作権限を持っています。それは一体、何のシステムでしょう？',
    choices: ['旅行代理店向け顧客管理システム', '航空会社の運航管制システム', '航空券予約システム', 'マイル計算を手動で検証するための検算用システム'],
    answer_index: 2,
    explanation: '正解は航空券予約システム！旅行代理店が使うGDS（グローバル・ディストリビューション・システム）の操作権限を個人で持っているという、もはやプロの領域です。',
    difficulty: 'hard' as const,
    category: '榎本さん',
  },
  {
    question: '榎本さんは、米国の某ホテルチェーンで優待を受けるために、そのためだけにわざわざ専用のクレジットカードを持っています。さて、そのホテルチェーンとはどこでしょう？',
    choices: ['マリオット', 'ハイアット', 'ヒルトン', 'シェラトン'],
    answer_index: 2,
    explanation: '正解はヒルトン！ヒルトンの専用クレカを持つことで、ゴールド会員特典や部屋のアップグレードなどの優待が受けられます。旅のためにクレカを作る…それが榎本流。',
    difficulty: 'hard' as const,
    category: '榎本さん',
  },
  {
    question: '榎本さんは新横浜勤務時代、東京―新横浜間の新幹線定期を持っていました。しかもその定期券、かなり通好みでした。どのような定期券だったでしょう？',
    choices: ['ICカード型の新幹線専用定期', 'ICカード型で在来線にも乗れる定期', '磁気カード型で、新幹線も在来線も乗れた定期', '回数券を日によって使い分けていた'],
    answer_index: 2,
    explanation: '正解は磁気カード型の新幹線定期！今どきICカード全盛の時代に、あえて磁気カードを選ぶのが榎本流。新幹線も在来線も乗れて、マイルも貯まる組み合わせがあったとか。さすがポイ活の達人。',
    difficulty: 'hard' as const,
    category: '榎本さん',
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
