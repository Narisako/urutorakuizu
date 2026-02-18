// フォールバック用の内蔵クイズ（LLM生成失敗時に使用）
import { QuizQuestion } from './types';
import { v4 as uuidv4 } from 'uuid';

const FALLBACK_RAW = [
  {
    question: '盛岡三大麺に含まれないのはどれ？',
    choices: ['わんこそば', '盛岡冷麺', 'じゃじゃ麺', '盛岡ラーメン'],
    answer_index: 3,
    explanation: '盛岡三大麺は「わんこそば」「盛岡冷麺」「じゃじゃ麺」です。',
    difficulty: 'easy' as const,
    category: '食',
  },
  {
    question: '岩手県の面積は北海道に次いで全国何位？',
    choices: ['2位', '3位', '4位', '5位'],
    answer_index: 0,
    explanation: '岩手県は都道府県面積ランキングで北海道に次ぐ第2位です。広い！',
    difficulty: 'easy' as const,
    category: 'あるある',
  },
  {
    question: '中尊寺金色堂がある市はどこ？',
    choices: ['平泉町', '奥州市', '一関市', '花巻市'],
    answer_index: 0,
    explanation: '中尊寺金色堂は平泉町にあり、世界文化遺産に登録されています。',
    difficulty: 'easy' as const,
    category: '観光',
  },
  {
    question: '福田パンの本店がある都市はどこ？',
    choices: ['盛岡市', '花巻市', '北上市', '奥州市'],
    answer_index: 0,
    explanation: '福田パンは盛岡市民のソウルフード。コッペパンに好きな具を挟んでもらえます。',
    difficulty: 'easy' as const,
    category: '食',
  },
  {
    question: '「じぇじぇじぇ！」が流行語になったNHKドラマ「あまちゃん」の舞台となった市は？',
    choices: ['久慈市', '宮古市', '釜石市', '大船渡市'],
    answer_index: 0,
    explanation: '「あまちゃん」は久慈市の小袖海岸を舞台にした朝ドラです。',
    difficulty: 'easy' as const,
    category: '文化',
  },
  {
    question: '岩手県の県庁所在地はどこ？',
    choices: ['盛岡市', '花巻市', '一関市', '奥州市'],
    answer_index: 0,
    explanation: '岩手県の県庁所在地は盛岡市です。',
    difficulty: 'easy' as const,
    category: '地理',
  },
  {
    question: '盛岡さんさ踊りでギネス記録に認定されたのは何？',
    choices: ['和太鼓の同時演奏', '踊り子の人数', 'パレードの長さ', '祭りの日数'],
    answer_index: 0,
    explanation: 'さんさ踊りは和太鼓の同時演奏数でギネス世界記録に認定されています。',
    difficulty: 'normal' as const,
    category: '祭り',
  },
  {
    question: '宮沢賢治の出身地はどこ？',
    choices: ['花巻市', '盛岡市', '遠野市', '北上市'],
    answer_index: 0,
    explanation: '宮沢賢治は花巻市（旧・稗貫郡花巻町）の出身です。',
    difficulty: 'easy' as const,
    category: '文化',
  },
  {
    question: '遠野市が「ふるさと」として知られる妖怪は？',
    choices: ['カッパ', '座敷わらし', '天狗', '雪女'],
    answer_index: 0,
    explanation: '遠野市はカッパ伝説で有名。カッパ淵は人気の観光スポットです。',
    difficulty: 'easy' as const,
    category: '文化',
  },
  {
    question: '岩手県の最高峰「岩手山」の標高に最も近いのは？',
    choices: ['約2,038m', '約1,738m', '約2,338m', '約1,538m'],
    answer_index: 0,
    explanation: '岩手山の標高は2,038mで、岩手県の最高峰です。',
    difficulty: 'normal' as const,
    category: '地理',
  },
  {
    question: '北上展勝地は何の名所として有名？',
    choices: ['桜', '紅葉', 'ラベンダー', 'ひまわり'],
    answer_index: 0,
    explanation: '北上展勝地は「みちのく三大桜名所」のひとつ。約1万本の桜並木が圧巻です。',
    difficulty: 'easy' as const,
    category: '観光',
  },
  {
    question: '岩手県民あるある：盛岡から宮古まで車で約何時間？',
    choices: ['約2時間', '約30分', '約4時間', '約5時間'],
    answer_index: 0,
    explanation: '盛岡から宮古は約100km、車で約2時間。岩手の広さを実感します。',
    difficulty: 'normal' as const,
    category: 'あるある',
  },
  {
    question: '岩手県の県の花は？',
    choices: ['キリ', 'サクラ', 'リンドウ', 'ツツジ'],
    answer_index: 0,
    explanation: '岩手県の県の花はキリ（桐）です。',
    difficulty: 'normal' as const,
    category: '文化',
  },
  {
    question: '小岩井農場がある場所はどこ？',
    choices: ['雫石町', '盛岡市', '滝沢市', '八幡平市'],
    answer_index: 0,
    explanation: '小岩井農場は雫石町にある日本最大級の民間農場です。',
    difficulty: 'easy' as const,
    category: '観光',
  },
  {
    question: '盛岡冷麺のスープの特徴は？',
    choices: ['牛骨ベースのコクのあるスープ', '豚骨ベースのこってりスープ', '鶏ガラベースのあっさりスープ', '魚介ベースの和風スープ'],
    answer_index: 0,
    explanation: '盛岡冷麺は牛骨・牛肉ベースのコクがありながらさっぱりしたスープが特徴です。',
    difficulty: 'normal' as const,
    category: '食',
  },
  {
    question: '岩手県沿岸を走るJR路線の愛称は？',
    choices: ['三陸鉄道リアス線', '三陸鉄道海岸線', '三陸鉄道潮風線', '三陸鉄道はまかぜ線'],
    answer_index: 0,
    explanation: '三陸鉄道リアス線は日本最長の第三セクター路線として有名です。',
    difficulty: 'normal' as const,
    category: '観光',
  },
  {
    question: 'わんこそばの「わんこ」の意味は？',
    choices: ['お椀', '子犬', '一口', '早い'],
    answer_index: 0,
    explanation: '「わんこ」は岩手の方言で「お椀」のこと。小さなお椀で次々食べます。',
    difficulty: 'easy' as const,
    category: '方言',
  },
  {
    question: '岩手県あるある：冬の挨拶「しばれるね〜」の意味は？',
    choices: ['すごく寒いね', 'すごく眠いね', 'すごく疲れたね', 'すごくお腹すいたね'],
    answer_index: 0,
    explanation: '「しばれる」は東北・北海道で使われる「とても寒い」を表す方言です。',
    difficulty: 'easy' as const,
    category: '方言',
  },
  {
    question: '釜石市が「ラグビーのまち」と呼ばれる理由は？',
    choices: ['新日鉄釜石が日本選手権7連覇', '日本初のラグビー場がある', 'ラグビーボールの生産量日本一', 'ラグビー人口の割合が日本一'],
    answer_index: 0,
    explanation: '新日鉄釜石は日本選手権7連覇を達成し、「北の鉄人」と呼ばれました。',
    difficulty: 'normal' as const,
    category: '文化',
  },
  {
    question: '岩手県あるある：県南の人が盛岡に行くことを何と言う？',
    choices: ['盛岡に「上がる」', '盛岡に「下る」', '盛岡に「渡る」', '盛岡に「飛ぶ」'],
    answer_index: 0,
    explanation: '県南の人は盛岡に行くことを「上がる」と言いがちです。県庁所在地＝上、という感覚。',
    difficulty: 'normal' as const,
    category: 'あるある',
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
