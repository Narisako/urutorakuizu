// ===== カスタムサーバ: Next.js + Socket.IO =====
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { pickAnimalName } from './src/lib/animals';
import { getNextQuestion, preloadQuestions } from './src/lib/quiz-generator';
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

// 現在のラウンド
let currentRound: RoundState | null = null;

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

  const httpServer = createServer((req, res) => {
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
        socket.emit('joined', { token: '__screen__', name: 'Screen' });
        socket.emit('state', buildStateDTO(currentRound));
        return;
      }

      // 既存tokenの復元
      if (token && players.has(token)) {
        name = players.get(token)!;
        console.log(`[Socket] Rejoined: ${name} (${token.substring(0, 8)}...)`);
      } else {
        // 新規参加者
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
      }

      // tokenをソケットに紐づけ
      (socket as any).playerToken = token;

      socket.emit('joined', { token, name });
      socket.emit('state', buildStateDTO(currentRound));

      // スクリーンに人数更新を通知
      io.emit('answer_count', {
        totalAnswers: currentRound?.totalAnswers || 0,
        correctAnswers: currentRound?.correctAnswers || 0,
        totalPlayers: getConnectedPlayerCount(),
      });
    });

    // ----- answer -----
    socket.on('answer', (data) => {
      const token = (socket as any).playerToken as string | undefined;
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

      // 勝者判定: 最初の正解者
      if (isCorrect && !currentRound.winnerToken) {
        const name = players.get(token) || '不明';
        currentRound.winnerToken = token;
        currentRound.winnerName = name;
        currentRound.winnerAt = timestamp;
        currentRound.phase = 'revealed';
        console.log(`[Game] Winner: ${name} (${timestamp})`);

        // 全員に通知
        io.emit('winner', { token, name });
        io.emit('state', buildStateDTO(currentRound));
        return;
      }

      // 全員回答済み（勝者なし）チェック
      if (currentRound.totalAnswers >= getConnectedPlayerCount() && !currentRound.winnerToken) {
        currentRound.phase = 'revealed';
        io.emit('state', buildStateDTO(currentRound));
        return;
      }

      // 回答数だけ更新
      io.emit('answer_count', {
        totalAnswers: currentRound.totalAnswers,
        correctAnswers: currentRound.correctAnswers,
        totalPlayers: getConnectedPlayerCount(),
      });
    });

    // ----- next_question -----
    socket.on('next_question', async () => {
      console.log('[Game] Next question requested');
      try {
        const q = await getNextQuestion();
        currentRound = {
          questionId: q.questionId,
          question: q.question,
          choices: q.choices,
          answer_index: q.answer_index,
          explanation: q.explanation,
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
        console.log(`[Game] Question: ${q.question.substring(0, 50)}...`);
      } catch (err) {
        console.error('[Game] Failed to get next question:', err);
      }
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
        });
      }, 100);
    });
  });

  // クイズ事前生成
  await preloadQuestions();

  httpServer.listen(port, () => {
    console.log(`\n🎯 岩手クイズサーバ起動!`);
    console.log(`   Screen: http://localhost:${port}/screen`);
    console.log(`   Play:   http://localhost:${port}/play`);
    console.log(`   Port:   ${port}\n`);
  });
}

startServer().catch(console.error);
