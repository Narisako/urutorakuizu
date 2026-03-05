import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface Question {
  question: string;
  choices: [string, string, string, string];
  answer_index: number;
}

// GET: クイズ一覧を取得
export async function GET() {
  try {
    const questionsPath = path.join(process.cwd(), 'questions.csv');

    // ファイルが存在しない場合は空配列を返す
    if (!fs.existsSync(questionsPath)) {
      return NextResponse.json({ questions: [] });
    }

    const fileContent = fs.readFileSync(questionsPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    const questions: Question[] = [];
    let isFirstLine = true;

    for (const line of lines) {
      // ヘッダー行をスキップ
      if (isFirstLine) {
        isFirstLine = false;
        if (line.trim().startsWith('問題文') || line.trim().startsWith('question')) {
          continue;
        }
      }

      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 6) {
        const [question, choice1, choice2, choice3, choice4, answerNumStr] = parts;
        const answerNum = parseInt(answerNumStr);

        if (!isNaN(answerNum) && answerNum >= 1 && answerNum <= 4) {
          questions.push({
            question,
            choices: [choice1, choice2, choice3, choice4],
            answer_index: answerNum - 1,
          });
        }
      }
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('Failed to read questions:', err);
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
  }
}

// POST: クイズを保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const questions: Question[] = body.questions || [];

    // CSVフォーマットに変換
    const lines = ['問題文,選択肢1,選択肢2,選択肢3,選択肢4,正解番号'];

    for (const q of questions) {
      const line = [
        q.question,
        q.choices[0],
        q.choices[1],
        q.choices[2],
        q.choices[3],
        (q.answer_index + 1).toString(),
      ].join(',');
      lines.push(line);
    }

    const csvContent = lines.join('\n') + '\n';
    const questionsPath = path.join(process.cwd(), 'questions.csv');
    fs.writeFileSync(questionsPath, csvContent, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to save questions:', err);
    return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
  }
}
