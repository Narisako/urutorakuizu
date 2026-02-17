// LLMによるクイズ自動生成 + キュー管理
import { QuizQuestion } from './types';
import { getFallbackQuestion } from './fallback-questions';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `あなたは岩手県のクイズ出題AIです。岩手県に関する4択クイズを1問生成してください。

■ ルール
- 岩手県民が共感して笑える内容（あるある、ローカルネタ歓迎）
- 中尊寺、わんこそば、福田パン、盛岡冷麺、じゃじゃ麺、さんさ踊り、宮古、久慈、遠野、岩手山、北上展勝地、SL銀河、銀河鉄道の夜、あまちゃん等のローカル文脈OK
- 炎上・差別・政治宗教・個人攻撃・成人向け要素は絶対に含めない
- 細かすぎる統計数値は避ける
- 著作権侵害禁止
- 前の問題と重複しない新しい問題を作る

■ 出力: 以下のJSON**のみ**を返してください。説明文やマークダウンは不要です。
{"question":"問題文","choices":["A","B","C","D"],"answer_index":0,"explanation":"短い解説","difficulty":"easy","category":"食"}

categoryは: 地理|観光|食|祭り|方言|文化|あるある のいずれか
difficulty は: easy|normal のいずれか`;

// キュー
const questionQueue: QuizQuestion[] = [];
let generating = false;
const usedQuestions: string[] = []; // 出題済み問題文（重複防止用）

async function callLLM(): Promise<QuizQuestion | null> {
  const provider = process.env.LLM_PROVIDER || 'anthropic';
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'claude-sonnet-4-20250514';

  if (!apiKey) {
    console.warn('[QuizGen] LLM_API_KEY not set, using fallback');
    return null;
  }

  const recentContext = usedQuestions.slice(-10).join(' / ');
  const userPrompt = recentContext
    ? `これまでの出題: ${recentContext}\n\n上記と重複しない新しい問題を1問生成してください。JSONのみ返してください。`
    : '岩手県に関する4択クイズを1問生成してください。JSONのみ返してください。';

  try {
    if (provider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return parseQuizJSON(text);
    }
    // 将来: OpenAI対応はここに追加
    console.warn(`[QuizGen] Unknown provider: ${provider}`);
    return null;
  } catch (err) {
    console.error('[QuizGen] LLM call failed:', err);
    return null;
  }
}

function parseQuizJSON(text: string): QuizQuestion | null {
  try {
    // JSON部分を抽出（余計なテキストがあっても対応）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // バリデーション
    if (
      typeof parsed.question !== 'string' ||
      !Array.isArray(parsed.choices) ||
      parsed.choices.length !== 4 ||
      typeof parsed.answer_index !== 'number' ||
      parsed.answer_index < 0 ||
      parsed.answer_index > 3
    ) {
      console.error('[QuizGen] Invalid quiz format');
      return null;
    }

    return {
      questionId: uuidv4(),
      question: parsed.question,
      choices: parsed.choices,
      answer_index: parsed.answer_index,
      explanation: parsed.explanation || '',
      difficulty: parsed.difficulty === 'normal' ? 'normal' : 'easy',
      category: parsed.category || 'あるある',
    };
  } catch (err) {
    console.error('[QuizGen] JSON parse failed:', err);
    return null;
  }
}

/** キューに問題を補充（非同期、重複実行防止） */
async function refillQueue(targetCount: number = 3): Promise<void> {
  if (generating) return;
  generating = true;

  try {
    while (questionQueue.length < targetCount) {
      console.log(`[QuizGen] Generating question... (queue: ${questionQueue.length}/${targetCount})`);
      const q = await callLLM();
      if (q) {
        questionQueue.push(q);
        console.log(`[QuizGen] Generated: ${q.question.substring(0, 40)}...`);
      } else {
        // LLM失敗 → フォールバック1問追加して続行
        const fb = getFallbackQuestion();
        questionQueue.push(fb);
        console.log(`[QuizGen] Fallback used: ${fb.question.substring(0, 40)}...`);
      }
    }
  } finally {
    generating = false;
  }
}

/** 次の問題を取得（キューから取り出し、バックグラウンドで補充開始） */
export async function getNextQuestion(): Promise<QuizQuestion> {
  // キューが空なら同期的に待つ
  if (questionQueue.length === 0) {
    await refillQueue(1);
  }

  const question = questionQueue.shift()!;
  usedQuestions.push(question.question);

  // バックグラウンドで補充
  refillQueue(3).catch(console.error);

  return question;
}

/** サーバ起動時に事前生成 */
export async function preloadQuestions(): Promise<void> {
  console.log('[QuizGen] Preloading questions...');
  await refillQueue(3);
  console.log(`[QuizGen] Preload complete. Queue size: ${questionQueue.length}`);
}

export function getQueueSize(): number {
  return questionQueue.length;
}
