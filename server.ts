// ===== カスタムサーバ: Next.js + Socket.IO =====
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { pickAnimalName } from './src/lib/animals';
// カスタム問題キュー（LLM不要）
import type {
  QuizQuestion,
  RoundState,
  RoundStateDTO,
  ServerToClientEvents,
  ClientToServerEvents,
} from './src/lib/types';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '8000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

// ===== インメモリ状態管理 =====

// プレイヤー管理: token → name
const players = new Map<string, string>();
const usedNames = new Set<string>();

// カスタム問題キュー
let customQuestions: { question: string; choices: string[]; answer_index: number }[] = [];
let customQuestionIndex = 0;

// 現在のラウンド
let currentRound: RoundState | null = null;

function getChoiceCounts(round: RoundState | null): number[] {
  const counts = [0, 0, 0, 0];
  if (!round) return counts;
  for (const [, ans] of round.answers) {
    if (ans.choiceIndex >= 0 && ans.choiceIndex < 4) {
      counts[ans.choiceIndex]++;
    }
  }
  return counts;
}

function buildStateDTO(round: RoundState | null): RoundStateDTO {
  if (!round) {
    return {
      questionId: '',
      question: '',
      choices: [],
      answer_index: null,
      explanation: null,
      winnerToken: null,
      winnerName: null,
      totalAnswers: 0,
      correctAnswers: 0,
      totalPlayers: getConnectedPlayerCount(),
      phase: 'waiting',
    };
  }
  return {
    questionId: round.questionId,
    question: round.question,
    choices: round.choices,
    answer_index: round.phase === 'revealed' ? round.answer_index : null,
    explanation: round.phase === 'revealed' ? round.explanation : null,
    winnerToken: round.winnerToken,
    winnerName: round.winnerName,
    totalAnswers: round.totalAnswers,
    correctAnswers: round.correctAnswers,
    totalPlayers: getConnectedPlayerCount(),
    phase: round.phase,
  };
}

function getConnectedPlayerCount(): number {
  if (!io) return 0;
  let count = 0;
  for (const [, s] of io.of('/').sockets) {
    if ((s as any).playerToken && (s as any).playerToken !== '__screen__') {
      count++;
    }
  }
  return count;
}

// ===== Socket.IO =====
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

async function startServer() {
  await app.prepare();

  const publicUrl = process.env.PUBLIC_URL || '';

  const httpServer = createServer((req, res) => {
    // 公開URL設定を返すAPI
    if (req.url === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ publicUrl }));
      return;
    }
    handle(req, res);
  });

  io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    pingInterval: 10000,
    pingTimeout: 5000,
    // 100名同時接続対応
    maxHttpBufferSize: 1e6,
    connectTimeout: 10000,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ----- join -----
    socket.on('join', (data) => {
      let token = data?.token;
      let name: string | undefined;

      // スクリーン画面の場合はプレイヤー登録しない
      if (token === '__screen__') {
        (socket as any).playerToken = '__screen__';
        // スクリーン接続時にラウンドをリセットして全員をwaitingに戻す
        currentRound = null;
        socket.emit('joined', { token: '__screen__', name: 'Screen' });
        io.emit('state', buildStateDTO(currentRound));
        return;
      }

      // 常に新しいtokenと名前を割り当てる
      token = uuidv4();
      const picked = pickAnimalName(usedNames);
      if (!picked) {
        socket.emit('error', { message: '参加者上限に達しました' });
        return;
      }
      name = picked;
      players.set(token, name);
      usedNames.add(name);
      console.log(`[Socket] New player: ${name} (${token.substring(0, 8)}...)`);

      // tokenをソケットに紐づけ
      (socket as any).playerToken = token;

      socket.emit('joined', { token, name });
      socket.emit('state', buildStateDTO(currentRound));

      // スクリーンに人数更新を通知
      io.emit('answer_count', {
        totalAnswers: currentRound?.totalAnswers || 0,
        correctAnswers: currentRound?.correctAnswers || 0,
        totalPlayers: getConnectedPlayerCount(),
        choiceCounts: getChoiceCounts(currentRound),
      });
    });

    // ----- answer -----
    socket.on('answer', (data) => {
      const token = (socket as any).playerToken as string | undefined;
      console.log(`[Answer] token=${token?.substring(0,8)} qid=${data?.questionId?.substring(0,8)} current=${currentRound?.questionId?.substring(0,8)} phase=${currentRound?.phase}`);
      if (!token || token === '__screen__' || !currentRound) return;
      if (currentRound.phase !== 'active') return;
      if (currentRound.questionId !== data.questionId) return;

      // 既に回答済み
      if (currentRound.answeredTokens.has(token)) return;

      const timestamp = Date.now();
      currentRound.answeredTokens.add(token);
      currentRound.answers.set(token, { choiceIndex: data.choiceIndex, timestamp });
      currentRound.totalAnswers++;

      const isCorrect = data.choiceIndex === currentRound.answer_index;
      if (isCorrect) {
        currentRound.correctAnswers++;
      }

      // 毎回答必ずカウントを全員にブロードキャスト
      io.emit('answer_count', {
        totalAnswers: currentRound.totalAnswers,
        correctAnswers: currentRound.correctAnswers,
        totalPlayers: getConnectedPlayerCount(),
        choiceCounts: getChoiceCounts(currentRound),
      });

      // 勝者候補を記録（まだrevealしない）
      if (isCorrect && !currentRound.winnerToken) {
        const name = players.get(token) || '不明';
        currentRound.winnerToken = token;
        currentRound.winnerName = name;
        currentRound.winnerAt = timestamp;
        console.log(`[Game] Fastest correct: ${name} (${timestamp})`);
      }
    });

    // ----- set_questions -----
    socket.on('set_questions', (data) => {
      console.log(`[Game] Received ${data.length} custom questions`);
      customQuestions = data;
      customQuestionIndex = 0;
      socket.emit('questions_set', { count: data.length });
    });

    // ----- next_question -----
    socket.on('next_question', async () => {
      console.log(`[Game] Next question requested (${customQuestionIndex}/${customQuestions.length})`);

      if (customQuestionIndex >= customQuestions.length) {
        console.log('[Game] No more questions');
        socket.emit('no_more_questions');
        return;
      }

      const q = customQuestions[customQuestionIndex];
      customQuestionIndex++;

      currentRound = {
        questionId: uuidv4(),
        question: q.question,
        choices: q.choices,
        answer_index: q.answer_index,
        explanation: '',
        answeredTokens: new Set(),
        answers: new Map(),
        winnerToken: null,
        winnerName: null,
        winnerAt: null,
        totalAnswers: 0,
        correctAnswers: 0,
        phase: 'active',
      };
      io.emit('state', buildStateDTO(currentRound));
      console.log(`[Game] Question ${customQuestionIndex}/${customQuestions.length}: ${q.question.substring(0, 50)}...`);
    });

    // ----- reset_game (イベント終了) -----
    socket.on('reset_game', () => {
      console.log('[Game] Reset game requested');
      currentRound = null;
      customQuestions = [];
      customQuestionIndex = 0;
      io.emit('state', buildStateDTO(currentRound));
    });

    // ----- close_round (締め切り) -----
    socket.on('close_round', () => {
      console.log('[Game] Close round requested');
      if (!currentRound || currentRound.phase !== 'active') return;
      currentRound.phase = 'revealed';

      if (currentRound.winnerToken && currentRound.winnerName) {
        const winnerPayload = { token: currentRound.winnerToken, name: currentRound.winnerName };
        io.emit('winner', winnerPayload);
      }
      io.emit('state', buildStateDTO(currentRound));
      console.log(`[Game] Round closed. Winner: ${currentRound.winnerName || 'none'}`);
    });

    // ----- disconnect -----
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      // 人数更新
      setTimeout(() => {
        io.emit('answer_count', {
          totalAnswers: currentRound?.totalAnswers || 0,
          correctAnswers: currentRound?.correctAnswers || 0,
          totalPlayers: getConnectedPlayerCount(),
          choiceCounts: getChoiceCounts(currentRound),
        });
      }, 100);
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n⚡ ４択早押しバトル サーバ起動!`);
    console.log(`   Screen: http://localhost:${port}/screen`);
    console.log(`   Play:   http://localhost:${port}/play`);
    console.log(`   Port:   ${port}\n`);
  });
}

startServer().catch(console.error);
