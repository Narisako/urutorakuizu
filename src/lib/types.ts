// ===== 共通型定義 =====

export interface QuizQuestion {
  questionId: string;
  question: string;
  choices: string[];
  answer_index: number;
  explanation: string;
  difficulty: 'easy' | 'normal';
  category: string;
}

export interface PlayerInfo {
  token: string;
  name: string;
  connectedAt: number;
}

export interface RoundState {
  questionId: string;
  question: string;
  choices: string[];
  answer_index: number;
  explanation: string;
  answeredTokens: Set<string>;
  answers: Map<string, { choiceIndex: number; timestamp: number }>;
  winnerToken: string | null;
  winnerName: string | null;
  winnerAt: number | null;
  totalAnswers: number;
  correctAnswers: number;
  phase: 'waiting' | 'active' | 'revealed';
}

/** サーバ→クライアント送信用（Setを配列にしたもの） */
export interface RoundStateDTO {
  questionId: string;
  question: string;
  choices: string[];
  answer_index: number | null; // revealed時のみ送信
  explanation: string | null;  // revealed時のみ送信
  winnerToken: string | null;
  winnerName: string | null;
  totalAnswers: number;
  correctAnswers: number;
  totalPlayers: number;
  phase: 'waiting' | 'active' | 'revealed';
}

export interface JoinResult {
  token: string;
  name: string;
}

// Socket.IO イベント型
export interface ServerToClientEvents {
  state: (data: RoundStateDTO) => void;
  joined: (data: JoinResult) => void;
  winner: (data: { token: string; name: string }) => void;
  answer_count: (data: { totalAnswers: number; correctAnswers: number; totalPlayers: number; choiceCounts: number[] }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  join: (data: { token?: string }) => void;
  answer: (data: { questionId: string; choiceIndex: number }) => void;
  next_question: () => void;
  close_round: () => void;
}
