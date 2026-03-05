// CSVファイルからクイズを読み込む
// フォーマット: 問題文,選択肢1,選択肢2,選択肢3,選択肢4,正解番号
import { QuizQuestion } from './types';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

let allQuestions: QuizQuestion[] = [];
let currentIndex = 0;

/** CSV行をパースしてクイズオブジェクトに変換 */
function parseCSVLine(line: string): QuizQuestion | null {
  // 空行やコメント行（#で始まる）をスキップ
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  // CSVをパース（簡易版、カンマ区切り）
  const parts = trimmed.split(',').map(p => p.trim());

  if (parts.length < 6) {
    console.warn(`[QuizLoader] Invalid CSV format (expected 6 columns): ${trimmed.substring(0, 50)}...`);
    return null;
  }

  const [question, choice1, choice2, choice3, choice4, answerNumStr] = parts;
  const answerNum = parseInt(answerNumStr);

  if (isNaN(answerNum) || answerNum < 1 || answerNum > 4) {
    console.warn(`[QuizLoader] Invalid answer number: ${answerNumStr}`);
    return null;
  }

  const choices = [choice1, choice2, choice3, choice4];
  const answer_index = answerNum - 1; // 1=0, 2=1, 3=2, 4=3

  return {
    questionId: uuidv4(),
    question,
    choices,
    answer_index,
    explanation: '',
    difficulty: 'easy',
    category: '一般',
  };
}

/** サーバ起動時にクイズをCSVファイルから読み込む */
export async function loadQuestions(): Promise<void> {
  try {
    const questionsPath = path.join(process.cwd(), 'questions.csv');
    const fileContent = fs.readFileSync(questionsPath, 'utf-8');
    const lines = fileContent.split('\n');

    allQuestions = [];
    let isFirstLine = true;
    for (const line of lines) {
      // 1行目がヘッダーの場合はスキップ
      if (isFirstLine) {
        isFirstLine = false;
        // ヘッダー行かどうか判定（問題文,選択肢...で始まる場合）
        if (line.trim().startsWith('問題文') || line.trim().startsWith('question')) {
          continue;
        }
      }

      const quiz = parseCSVLine(line);
      if (quiz) {
        allQuestions.push(quiz);
      }
    }

    if (allQuestions.length === 0) {
      throw new Error('No valid questions found in questions.csv');
    }

    // シャッフル
    shuffleArray(allQuestions);

    console.log(`[QuizLoader] Loaded ${allQuestions.length} questions from questions.csv`);
  } catch (err) {
    console.error('[QuizLoader] Failed to load questions.csv:', err);
    throw err;
  }
}

/** 配列をシャッフル（Fisher-Yates） */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/** 次の問題を取得（順番に出題、最後まで行ったらループ） */
export function getNextQuestion(): QuizQuestion {
  if (allQuestions.length === 0) {
    throw new Error('No questions available. Please add questions to questions.json');
  }

  const question = allQuestions[currentIndex];
  currentIndex = (currentIndex + 1) % allQuestions.length;

  // 問題が一周したら再シャッフル
  if (currentIndex === 0) {
    console.log('[QuizLoader] Reshuffling questions...');
    shuffleArray(allQuestions);
    // 各問題に新しいUUIDを付与（同じ問題でも別の問題として扱う）
    allQuestions.forEach(q => {
      q.questionId = uuidv4();
    });
  }

  return question;
}

export function getQuestionCount(): number {
  return allQuestions.length;
}
