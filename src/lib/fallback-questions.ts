// フォールバック用の内蔵クイズ（LLM生成失敗時に使用）
import { QuizQuestion } from './types';
import { v4 as uuidv4 } from 'uuid';

const FALLBACK_RAW = [
  {
    question: 'スガキヤのラーメンについてくる名物の「スプーン」。あの独特なフォークと一体化した形状の正式名称は？',
    choices: ['ラーメンフォーク', 'スガキヤスプーン', 'フォークスプーン', '味噌フォーク'],
    answer_index: 0,
    explanation: '正式名称は「ラーメンフォーク」。2005年にはニューヨーク近代美術館（MoMA）のオンラインストアで販売され、世界的に注目されました。名古屋のフードコートの片隅から世界のMoMAへ。',
    difficulty: 'hard' as const,
    category: '名古屋めし',
  },
  {
    question: '名古屋市の「市の木」はクスノキですが、実は名古屋市内で最も多い街路樹はクスノキではありません。何の木？',
    choices: ['ハナミズキ', 'イチョウ', 'ケヤキ', 'サクラ'],
    answer_index: 0,
    explanation: '名古屋市で最も多い街路樹はハナミズキ（約1万本）。市の木に指定しておきながら街路樹ではクスノキを使わないという、名古屋の「言ってることとやってることが違う」感がたまりません。',
    difficulty: 'hard' as const,
    category: '雑学',
  },
  {
    question: '名古屋人の結婚式は派手婚で有名ですが、かつて嫁入りトラックの荷台に積んでいた嫁入り道具で、名古屋独特の「見栄」の象徴とされたものは？',
    choices: ['紅白の布で巻いた家電', '金箔の座布団', '菓子撒き用の5段タワー', '名前入りの提灯100個'],
    answer_index: 0,
    explanation: '嫁入りトラックには冷蔵庫やタンスを紅白の布で包んで見えるように積み、近所に見せびらかすのが名古屋流。中身より「見た目」重視。引っ越しというよりパレードでした。',
    difficulty: 'hard' as const,
    category: '文化',
  },
  {
    question: '愛知県には「弥富市」という金魚の一大産地があります。日本一の品種数を誇りますが、弥富の金魚がある意外な場所に行ったことで有名です。どこ？',
    choices: ['宇宙（スペースシャトル）', 'エベレスト山頂', '南極の昭和基地', '北極海の潜水艦'],
    answer_index: 0,
    explanation: '1994年、スペースシャトル「コロンビア号」に弥富金魚が搭乗し宇宙へ。無重力での平衡感覚の実験でした。金魚が宇宙飛行士になった街、弥富。',
    difficulty: 'hard' as const,
    category: '雑学',
  },
  {
    question: '名古屋のコメダ珈琲店で「アイスコーヒー」を注文するとき、コメダの正式メニュー名は何？',
    choices: ['アイスコーヒー（たっぷりアイスコーヒーとは別）', 'コメ黒', 'アイスジェリコ', 'ブラックアイス'],
    answer_index: 0,
    explanation: 'ひっかけ問題！コメダでは普通に「アイスコーヒー」です。ただしコメダ通は「たっぷりアイスコーヒー」（1.5倍サイズ）を頼みます。初見で普通サイズを頼むと、そのデカさにまず驚くのが名古屋クオリティ。',
    difficulty: 'normal' as const,
    category: '名古屋めし',
  },
  {
    question: '名古屋市営地下鉄の駅で、1日の乗降客数が最も少ない駅はどこ？（2023年度）',
    choices: ['市役所駅', '栄駅', '名古屋駅', 'ナゴヤドーム前矢田駅'],
    answer_index: 0,
    explanation: '名城線の「市役所駅」は名古屋城の最寄りなのに1日約5,000人程度と激少。市役所に用がある人しか使わず、観光客は栄から歩いてしまう悲しい駅。名前負けの極み。',
    difficulty: 'hard' as const,
    category: '交通',
  },
  {
    question: '「名古屋走り」の一種「右折フェイント」。信号が青になった瞬間に右折車が直進車より先に突っ込む技ですが、愛知県警がこれに付けた正式な注意喚起の名称は？',
    choices: ['特に正式名称はない', '名古屋右折', 'ゴールド右折', '伊勢湾カーブ'],
    answer_index: 0,
    explanation: 'ひっかけ問題！愛知県警は正式名称なんて付けてません。ネットで「名古屋走り」と呼ばれているだけ。県警としては「そんなものに名前を付けて市民権を与えたくない」のが本音でしょう。',
    difficulty: 'hard' as const,
    category: '交通',
  },
  {
    question: 'トヨタ自動車の豊田章男会長（当時社長）が2020年に公開した「踊ってみた」動画。何のダンスを踊った？',
    choices: ['恋ダンス（恋/星野源）', 'パプリカ', 'USA（DA PUMP）', 'ソーラン節'],
    answer_index: 0,
    explanation: '豊田章男氏はトヨタイムズで「恋ダンス」を披露。時価総額日本一の企業トップが全力で恋ダンスを踊る姿は、愛知県民の度肝を抜きました。モリゾウさん、自由すぎる。',
    difficulty: 'hard' as const,
    category: '企業',
  },
  {
    question: '名古屋弁の「ケッタマシン」は自転車のことですが、この「ケッタ」の語源は？',
    choices: ['蹴ったくる（蹴る）', 'ケルト語のcart', '桁（けた）の上に乗るから', '明治の発明家・毛田氏の名前'],
    answer_index: 0,
    explanation: '「蹴ったくる」（蹴る）が語源。ペダルを蹴って進む機械だから「ケッタマシン」。略して「ケッタ」。世代によっては「ケッタマシーン」と微妙にカッコよく言う人も。',
    difficulty: 'normal' as const,
    category: '方言',
  },
  {
    question: '名古屋弁で「B紙」（ビーし）。東京や大阪の人には一切通じないこの言葉、何のこと？',
    choices: ['模造紙', 'B4用紙', 'トイレットペーパー', 'ボール紙'],
    answer_index: 0,
    explanation: '模造紙のことを名古屋では「B紙」と呼びます。学校で「B紙持ってきて」と言われて全国から転校してきた子が固まるのは名古屋あるある。ちなみに他地域では「大洋紙」「広用紙」など呼び方バラバラ。',
    difficulty: 'normal' as const,
    category: '方言',
  },
  {
    question: '愛知県が全国生産量1位の意外な農産物は？',
    choices: ['しそ（大葉）', 'キャベツ', 'みかん', 'いちご'],
    answer_index: 0,
    explanation: '愛知県は「しそ（大葉）」の生産量が全国1位で、シェアはなんと約40%！豊橋市が一大産地。刺身のつまの大葉、実はほぼ愛知産。地味だけど圧倒的。',
    difficulty: 'hard' as const,
    category: '経済',
  },
  {
    question: '名古屋のモーニング文化が行き過ぎて、かつて一部の喫茶店で朝コーヒーに付いてきた驚きのサービスは？',
    choices: ['カレーライス', '寿司', 'ステーキ', 'お弁当'],
    answer_index: 0,
    explanation: 'コーヒー1杯（400円前後）でカレーライスが付いてくる喫茶店が実在しました。もはやモーニングではなくランチ。「サービスの概念がバグってる」と他県民を震撼させた名古屋の喫茶文化。',
    difficulty: 'hard' as const,
    category: '食文化',
  },
  {
    question: 'JR名古屋駅の新幹線ホームにある「きしめん屋」。東京方面ホームと大阪方面ホームで味が違うという噂がありますが、実際は？',
    choices: ['運営会社が違うので本当に味が違う', '全く同じメニュー・同じ味', '東京方面の方が辛い', '大阪方面の方が出汁が濃い'],
    answer_index: 0,
    explanation: '上りホーム（東京方面）は「住よし」、下りホーム（大阪方面）も「住よし」…ですが実は運営元が異なります。食べ比べる名古屋通もいるとか。新幹線に乗る前の儀式。',
    difficulty: 'hard' as const,
    category: '名古屋めし',
  },
  {
    question: '名古屋の結婚式の引き出物で、かつて定番だった巨大な「鯛の形のお菓子」の正式名称は？',
    choices: ['おいり鯛（嫁入り鯛）', 'めで鯛', '寿鯛', '金シャチ鯛'],
    answer_index: 0,
    explanation: '名古屋の結婚式引き出物の名物「おいり鯛」。30〜40cmもある巨大な鯛型の砂糖菓子で、紙袋から尻尾がはみ出すサイズ。持ち帰りが大変すぎて、最近は小型化が進んでいます。',
    difficulty: 'hard' as const,
    category: '文化',
  },
  {
    question: '名古屋市科学館のプラネタリウムは世界最大級ですが、その球体の直径は？',
    choices: ['35m', '20m', '50m', '15m'],
    answer_index: 0,
    explanation: '直径35mで、内径世界最大のプラネタリウムとしてギネス認定。外から見ると巨大な銀の球がビルに乗っかっている異様な光景。「名古屋にデス・スターがある」と言われがち。',
    difficulty: 'normal' as const,
    category: '雑学',
  },
  {
    question: '名古屋めしの代表「味噌カツ」。矢場とんの本店の壁に描かれているマスコットキャラの豚は何をしている？',
    choices: ['相撲を取っている（ブタの横綱）', '味噌を塗っている', 'フライパンで踊っている', '名古屋城の前でポーズ'],
    answer_index: 0,
    explanation: '矢場とんのマスコットは「ブタのまわし姿の力士」。豚が自ら土俵入りするという、よく考えると哲学的で残酷なデザイン。でも名古屋市民はみんな大好き。',
    difficulty: 'normal' as const,
    category: '名古屋めし',
  },
  {
    question: '名古屋の「喫茶マウンテン」。登山に例えられるほど量が多いことで有名ですが、最も「遭難者」（完食できない人）が多いとされる伝説のメニューは？',
    choices: ['甘口いちごスパ', '抹茶小倉スパ', 'メロンスパ', 'あんかけバナナスパ'],
    answer_index: 0,
    explanation: '「甘口いちごスパゲティ」は生クリームといちごがパスタに絡む地獄のスイーツパスタ。完食を「登頂」、リタイアを「遭難」と呼ぶ文化。Googleレビューが登山レポートと化している。',
    difficulty: 'hard' as const,
    category: '名古屋めし',
  },
  {
    question: '愛知県の「県の魚」に指定されている魚は？',
    choices: ['クルマエビ', 'フグ', 'ウナギ', 'アユ'],
    answer_index: 0,
    explanation: '愛知県の県の魚は「クルマエビ」。実は愛知県はクルマエビの養殖発祥の地（1960年代に西尾市で成功）。ひつまぶしのイメージが強すぎてウナギと答えたくなりますが、ウナギは県の魚ではありません。',
    difficulty: 'hard' as const,
    category: '雑学',
  },
  {
    question: '名古屋市の「名古屋」の由来として最も有力な説は？',
    choices: ['「なごやか」な土地だったから', '波が穏やかな（和やか）入江', '那古野神社からの転用', '「魚（な）」が取れる「小屋」'],
    answer_index: 0,
    explanation: '「なごやか（和やか）」な土地という意味が最有力説。那古野→名護屋→名古屋と表記が変遷。「なごやか」から名古屋になったのに、運転マナーが全然なごやかじゃないのはご愛嬌。',
    difficulty: 'hard' as const,
    category: '歴史',
  },
  {
    question: '東海地方の中小企業経営者に馴染み深い「十六銀行」。名前の「十六」の由来は？',
    choices: ['毎月16日に開かれた市場で両替商を営んでいたから', '創業時の出資者が16人だったから', '16番目にできた国立銀行だから', '所在地の住所が16番地だったから'],
    answer_index: 0,
    explanation: '岐阜の「十六銀行」は、毎月16日に開催されていた市（いち）で両替商を営んでいたことが由来。ちなみに愛知県には他にも数字系銀行があり、百五銀行は第百五国立銀行が由来。数字銀行多すぎ問題。',
    difficulty: 'hard' as const,
    category: 'ビジネス',
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
