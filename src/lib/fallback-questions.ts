// フォールバック用の内蔵クイズ（LLM生成失敗時に使用）
import { QuizQuestion } from './types';
import { v4 as uuidv4 } from 'uuid';

const FALLBACK_RAW = [
  {
    question: '名古屋めしの代表格「味噌煮込みうどん」。麺が硬いのは失敗ではなく意図的ですが、その理由は？',
    choices: ['塩を入れずに打つため', '茹で時間が短いため', '特殊な小麦粉を使うため', '冷水で締めるため'],
    answer_index: 0,
    explanation: '味噌煮込みうどんの麺は塩を入れずに打つため、グルテンが十分に形成されず硬い食感になります。味噌の塩分で味が入るので塩は不要なのです。',
    difficulty: 'normal' as const,
    category: '名古屋めし',
  },
  {
    question: '名古屋の喫茶店文化「モーニング」。コーヒー1杯の値段でトーストやゆで卵がつく発祥の地は？',
    choices: ['一宮市', '名古屋市中区', '豊橋市', '岐阜市'],
    answer_index: 0,
    explanation: 'モーニングサービスの発祥は繊維の街・一宮市。商談に来る繊維業者をもてなすため、コーヒーにサービスを付けたのが始まりです。',
    difficulty: 'normal' as const,
    category: '食文化',
  },
  {
    question: '名古屋市の人口は全国の市で何番目に多い？（2024年時点）',
    choices: ['3番目', '2番目', '4番目', '5番目'],
    answer_index: 0,
    explanation: '東京23区（特別区）を除くと、横浜市→大阪市→名古屋市の順。約232万人で堂々の3位です。',
    difficulty: 'easy' as const,
    category: '基本情報',
  },
  {
    question: 'トヨタ自動車の本社がある市は？',
    choices: ['豊田市', '名古屋市', '刈谷市', '岡崎市'],
    answer_index: 0,
    explanation: 'トヨタの本社は豊田市。ちなみに豊田市は元々「挙母（ころも）市」でしたが、1959年にトヨタにちなんで改名されました。企業名が市名になった珍しい例です。',
    difficulty: 'easy' as const,
    category: '企業',
  },
  {
    question: '名古屋発祥の「コメダ珈琲店」の「コメダ」の由来は？',
    choices: ['創業者の実家が米屋だったから', '米のように毎日通ってほしいから', 'コメディの略', '米田さんが創業したから'],
    answer_index: 0,
    explanation: '創業者・加藤太郎氏の実家が米屋で、「米屋の太郎」→「コメ太」→「コメダ」と名付けられました。',
    difficulty: 'normal' as const,
    category: '企業',
  },
  {
    question: '名古屋城の天守閣の屋根にある金鯱（きんしゃち）。現在の金鯱に使われている金の量は約何kg？',
    choices: ['約88kg', '約44kg', '約150kg', '約200kg'],
    answer_index: 0,
    explanation: '現在の金鯱には約88kgの金が使われています。金の時価で約10億円以上！徳川家の権力の象徴でした。',
    difficulty: 'normal' as const,
    category: '歴史・文化',
  },
  {
    question: '「名古屋走り」と揶揄される名古屋の運転マナー。愛知県の交通事故死者数は長年全国ワーストでしたが、2023年に何位だった？',
    choices: ['1位（ワースト）', '2位', '3位', '5位'],
    answer_index: 0,
    explanation: '残念ながら2023年も愛知県がワースト1位でした。ただし人口あたりに換算すると中位程度です。',
    difficulty: 'normal' as const,
    category: '雑学',
  },
  {
    question: '名古屋のビジネスパーソンに馴染み深い「名駅」。この略称の読み方は？',
    choices: ['めいえき', 'なえき', 'みょうえき', 'めいすて'],
    answer_index: 0,
    explanation: '「めいえき」が正解。名古屋駅の略称で、住所にも「名駅」が正式に使われています。郵便番号も存在する珍しい略称地名です。',
    difficulty: 'easy' as const,
    category: '基本情報',
  },
  {
    question: '愛知県は製造品出荷額等が全国1位ですが、2022年の金額はおよそいくら？',
    choices: ['約49兆円', '約30兆円', '約20兆円', '約60兆円'],
    answer_index: 0,
    explanation: '愛知県の製造品出荷額等は約49兆円で、46年連続日本一。2位の神奈川県（約17兆円）に大差をつけています。',
    difficulty: 'normal' as const,
    category: '経済',
  },
  {
    question: '名古屋弁で「えらい」はどういう意味？',
    choices: ['疲れた・しんどい', '偉い・すごい', '怒っている', '嬉しい'],
    answer_index: 0,
    explanation: '名古屋弁の「えらい」は「疲れた・しんどい」の意味。「今日はえらかったわ〜」は「今日は疲れた」です。ビジネスの場で誤解注意！',
    difficulty: 'easy' as const,
    category: '方言',
  },
  {
    question: '中小企業基本法における「中小企業」の定義。製造業の場合、資本金がいくら以下？',
    choices: ['3億円以下', '1億円以下', '5億円以下', '10億円以下'],
    answer_index: 0,
    explanation: '製造業の中小企業は「資本金3億円以下 または 従業員300人以下」。ちなみにサービス業は「5千万円以下 または 100人以下」です。',
    difficulty: 'normal' as const,
    category: 'ビジネス',
  },
  {
    question: '名古屋のB級グルメ「台湾ラーメン」。実は台湾には存在しません。どこの料理店が発祥？',
    choices: ['味仙', '台湾料理 味源', '好来道場', '萬珍軒'],
    answer_index: 0,
    explanation: '味仙（みせん）の台湾人店主が、台湾の担仔麺をアレンジして激辛にしたのが始まり。台湾にはない名古屋オリジナルです。',
    difficulty: 'easy' as const,
    category: '名古屋めし',
  },
  {
    question: '名古屋のお土産の定番「ういろう」。主な原材料は？',
    choices: ['米粉と砂糖', '小麦粉とあんこ', 'もち米と黒蜜', 'くず粉と抹茶'],
    answer_index: 0,
    explanation: 'ういろうは米粉と砂糖を蒸して作ります。羊羹に似ていますが、あんこは使いません。もっちりした食感が特徴です。',
    difficulty: 'normal' as const,
    category: '名古屋めし',
  },
  {
    question: '名古屋証券取引所（名証）が2024年に統合された先は？',
    choices: ['どこにも統合されていない（現存）', '東京証券取引所', '大阪取引所', '廃止された'],
    answer_index: 0,
    explanation: '名証は現在も独立して存在しています。メイン市場・ネクスト市場を運営中。地元中小企業の上場先として重要な役割を果たしています。',
    difficulty: 'normal' as const,
    category: 'ビジネス',
  },
  {
    question: '名古屋の地下街の総延長は日本一ですが、その長さはおよそ？',
    choices: ['約6km', '約3km', '約10km', '約1.5km'],
    answer_index: 0,
    explanation: '名古屋駅〜栄にかけて広がる地下街は総延長約6km。エスカ・ユニモール・サカエチカ等が連なる日本最大級の地下ネットワークです。',
    difficulty: 'normal' as const,
    category: '雑学',
  },
  {
    question: '名古屋が発祥のコンビニチェーンは？',
    choices: ['サークルK', 'ローソン', 'ミニストップ', 'ファミリーマート'],
    answer_index: 0,
    explanation: 'サークルK（後のサークルKサンクス）はユニーグループが名古屋で展開を始めました。2016年にファミリーマートと統合されました。',
    difficulty: 'normal' as const,
    category: '企業',
  },
  {
    question: '愛知県の中小企業数は全国で何番目に多い？',
    choices: ['3番目', '1番目', '2番目', '5番目'],
    answer_index: 0,
    explanation: '東京都→大阪府→愛知県の順。約17万社の中小企業があり、特に製造業の比率が高いのが特徴です。ものづくり王国！',
    difficulty: 'normal' as const,
    category: 'ビジネス',
  },
  {
    question: '名古屋めし「ひつまぶし」の正しい食べ方の順番は？',
    choices: ['そのまま→薬味で→出汁茶漬け→好きな食べ方', '出汁茶漬け→薬味で→そのまま→好きな食べ方', '薬味で→そのまま→出汁茶漬け→好きな食べ方', '好きな食べ方で最初から最後まで'],
    answer_index: 0,
    explanation: '1杯目はそのまま、2杯目は薬味（ねぎ・わさび・のり）で、3杯目は出汁をかけて茶漬けに、4杯目は一番気に入った食べ方で。',
    difficulty: 'easy' as const,
    category: '名古屋めし',
  },
  {
    question: '名古屋市が本社の「ブラザー工業」。元々は何を作っていた会社？',
    choices: ['ミシン', 'プリンター', '自転車', '時計'],
    answer_index: 0,
    explanation: 'ブラザーは1908年にミシンの修理業として創業。現在はプリンター等のOA機器が主力ですが、ミシン事業も継続中です。',
    difficulty: 'normal' as const,
    category: '企業',
  },
  {
    question: '2027年開業予定だったリニア中央新幹線。名古屋〜東京（品川）の所要時間は最速何分の予定？',
    choices: ['約40分', '約20分', '約60分', '約90分'],
    answer_index: 0,
    explanation: '最速約40分で名古屋〜品川を結ぶ予定です。現在の「のぞみ」（約1時間40分）の半分以下！ただし開業時期は2027年以降にずれ込む見通しです。',
    difficulty: 'easy' as const,
    category: '交通',
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
