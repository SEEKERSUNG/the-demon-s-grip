// 对话树数据。节点: { text|string[], speaker?, actions[], options[{text,to,cond,effect}] }
// actions: 'quest:QID' 接取/交还, 'heal' 恢复, 'shop:SHOP_ID' 开商店
// 追加新对话 = 末尾加一条记录。

export const DIALOGUES = [
  // ================= 第一章 =================
  { id: 'DLG_ELDER', start: 'n1', nodes: {
    n1: { text: '……孩子，你回来了。', actions: ['quest:Q1_CH1_VILLAGE_DESTROYED', 'quest:Q2_CH1_CLEAR_CAVE', 'quest:Q3_CH1_HUNT'], options: [
      { text: '村子现在怎么样了？', to: 'n2' },
      { text: '魔潮……到底是怎么回事？', to: 'n3' },
      { text: '北境的王国军是怎么回事？', to: 'n4' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '那一夜，海面泛起诡异的红光，它们从浪里涌上来。老张头、翠花她爹……都没能逃出来。', options: [{ text: '……', to: 'n1' }] },
    n3: { text: '魔潮十年一遇，可这一次来得毫无征兆。有人说，是深渊里的什么东西在作怪。', options: [{ text: '……', to: 'n1' }] },
    n4: { text: '北境的军营在招兵。要讨伐魔物，投军是条路……但那是个吃人的地方，孩子，想清楚。', options: [{ text: '……', to: 'n1' }] },
  } },

  { id: 'DLG_SMITH', start: 'n1', nodes: {
    n1: { text: '（叮叮当当）啊，来客了。要打兵器？还是要修家伙？', actions: ['quest:Q1S_SMITH'], options: [
      { text: '看看铺子里的货', to: 'n_shop' },
      { text: '打听打听行情', to: 'n2' },
      { text: '（告辞）', to: 'end' },
    ] },
    n_shop: { text: '阿伟掀起门帘：进来看看吧，都是好货。', actions: ['shop:SHOP_SMITH'], options: [{ text: '（离开铁匠铺）', to: 'end' }] },
    n2: { text: '如今魔物横行，铁器供不应求。我这把老骨头，一天到晚锤个不停。', options: [{ text: '……', to: 'n1' }] },
  } },

  { id: 'DLG_INN', start: 'n1', nodes: {
    n1: { text: '进来歇歇脚吧，热水和床位都给你备好了。', actions: ['heal'], options: [
      { text: '在火炉边休息（恢复体力）', to: 'n1' },
      { text: '打听打听消息', to: 'n2' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '听说北境来了好些军爷，说是要打什么大魔物。唉，这日子，什么时候是个头啊。', options: [{ text: '……', to: 'n1' }] },
  } },

  { id: 'DLG_ALIN', start: 'n1', nodes: {
    n1: { text: '哥哥……你能帮我找到妈妈的护身符吗？那天晚上，我把它落在滩涂上了。', actions: ['quest:Q1S_ALIN'], options: [
      { text: '交给我吧。', to: 'n2' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '谢谢你……那是我妈妈留给我唯一的东西了。', options: [{ text: '……', to: 'end' }] },
  } },

  { id: 'DLG_SAGE', start: 'n1', nodes: {
    n1: { text: '年轻人，你的眼神，和这片大陆的人不一样。你从很远的地方来，对吗？', options: [
      { text: '你怎么知道？', to: 'n2' },
      { text: '魔潮到底从何而来？', to: 'n3' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '星辰告诉我，你身上有异世的微光。但无需惶恐——命运既然让你落在渔村，自有它的道理。', options: [{ text: '……', to: 'n1' }] },
    n3: { text: '魔潮并非天灾。每一次魔潮，都是一扇深渊之门的呼吸。有人……正在喂养它。', options: [{ text: '……', to: 'n1' }] },
  } },

  { id: 'DLG_BOATMAN', start: 'n1', nodes: {
    n1: { text: '海的那一边，就是大陆。我年轻时载过很多人去那边闯荡。年轻人，若要去北境，可以来找我。', options: [{ text: '（告辞）', to: 'end' }] },
  } },

  { id: 'DLG_CAPTAIN', start: 'n1', nodes: {
    n1: { text: '你就是那个一个人杀进渔村的愣头青？好样的。那魔潮头目就盘踞在黑鳞崖。', actions: ['quest:Q4_CH1_BOSS'], options: [
      { text: '领命！', to: 'n2' },
      { text: '黑鳞崖凶险，我怕自己还没准备好……', to: 'n4', cond: { flagNot: 'FLAG_Q3_DONE' } },
      { text: '黑鳞崖是什么地方？', to: 'n3' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '去吧，愿武神护佑你。取下它的首级，我向王上保举你入军。', options: [{ text: '……', to: 'end' }] },
    n3: { text: '黑鳞崖在村外东南，崖顶有个魔巢，妖气冲天，寻常士兵靠近了腿软。', options: [{ text: '……', to: 'n1' }] },
    n4: { text: '（铁臂上下打量你）欲速则不达。你连鱼人的窝都没端干净，去了黑鳞崖也是送命。先去多杀些魔物，磨砺身手，再来找我。', options: [{ text: '……受教了。', to: 'end' }] },
  } },

  // ================= 第二章 =================
  { id: 'DLG_QMG', start: 'n1', nodes: {
    n1: { text: '新来的？行，正好校场那边不太平，骷髅兵都闹到营门口了。', actions: ['quest:Q2_CH2_MISSION', 'quest:Q2S_QUARTERMASTER'], options: [
      { text: '领命！', to: 'n2' },
      { text: '打听打听军情', to: 'n3' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '办完事回来找我，军饷少不了你的。', options: [{ text: '……', to: 'end' }] },
    n3: { text: '深渊那边，魔王越来越嚣张了。上头催得紧，可兵员、军粮……唉，不好办呐。', options: [{ text: '……', to: 'n1' }] },
  } },

  { id: 'DLG_COMRADE', start: 'n1', nodes: {
    n1: { text: '兄弟，你过来。我偷偷告诉你——这军饷和军粮，数目对不上。', actions: ['quest:Q2_CH2_RATIONS', 'quest:Q2_CH2_BETRAYAL'], options: [
      { text: '我去查一查。', to: 'n2' },
      { text: '怎么会这样？', to: 'n3' },
      { text: '（压低声音）说吧，你查到了什么。', to: 'n4', cond: { flag: 'FLAG_LEARNED_CORRUPT' } },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '那本账本，可能落在沦陷之城。去那边废墟里找找，小心怨灵。', options: [{ text: '……', to: 'n1' }] },
    n3: { text: '每月发下来的军粮，发霉发硬不说，数量还少了两成。伙房老赵说，账上写的和实际到的不一样。', options: [{ text: '……', to: 'n1' }] },
    n4: { text: '（压低声音）证据指向统帅赫里安。而他……似乎已经察觉了。今夜军营恐有变故，你我都要小心。', options: [{ text: '（点头）我会小心的。', to: 'end' }] },
  } },

  { id: 'DLG_GENERAL', start: 'n1', nodes: {
    n1: { text: '哈哈，好一个少年英雄！正是军中需要的人才。放心，跟着我，荣华富贵少不了。', options: [
      { text: '（总觉得他的笑容有些虚伪）', to: 'end' },
    ] },
  } },

  { id: 'DLG_MENTOR', start: 'n1', nodes: {
    n1: { text: '（老者睁开眼）从军营里出来的人？哼，来得正好。那些蛀虫，配不上你这把刀。', actions: ['quest:Q2_CH2_TRAINING', 'quest:Q2_CH2_FINAL'], options: [
      { text: '请教变强之法。', to: 'n2' },
      { text: '关于深渊魔王……', to: 'n3' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '变强？先证明你的决心——荒原上的邪修教徒，取他们的性命来见我。', options: [{ text: '……', to: 'n1' }] },
    n3: { text: '魔王以邪修魔法炼化了整座深渊。要击败它，光靠力量不够，还得看清它力量的来源。', options: [{ text: '……', to: 'n1' }] },
  } },

  { id: 'DLG_GUARD', start: 'n1', nodes: {
    n1: { text: '（搓着手哈气）兄弟，你是从大营来的？这哨所附近，恶魔士兵越来越多，弟兄们顶不住了。', actions: ['quest:Q2S_OUTPOST'], options: [
      { text: '我去清剿。', to: 'n2' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '大恩不言谢！这鬼地方，总算有人帮衬一把了。', options: [{ text: '……', to: 'end' }] },
  } },

  { id: 'DLG_MERCHANT_CAMP', start: 'n1', nodes: {
    n1: { text: '（老万拍拍货担）军需百货，走南闯北就靠它了。营里的兄弟都爱在我这补货。', options: [
      { text: '看看货', to: 'n_shop' },
      { text: '打听打听行情', to: 'n2' },
      { text: '（告辞）', to: 'end' },
    ] },
    n_shop: { text: '（老万掀开货担）药水、魔力药水，都是硬通货。', actions: ['shop:SHOP_CAMP'], options: [{ text: '（离开货摊）', to: 'end' }] },
    n2: { text: '如今打仗，军需紧俏，运一趟货要过三五个关口。不过药水管够——打魔物，光靠血扛可不行。', options: [{ text: '……', to: 'n1' }] },
  } },

  // ================= 第三章 =================
  { id: 'DLG_EMISSARY', start: 'n1', nodes: {
    n1: { text: '王……不，大人。故土的烽火传到了幽都。人类与精灵全面开战，人类已濒临覆灭。', actions: ['quest:Q3_CH3_DISTRESS'], options: [
      { text: '（皱眉）细说。', to: 'n2' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '他们派出了使节团，求到幽都来了。若我们不出手，人族恐就此亡族。', options: [{ text: '备船，我们回大陆。', to: 'end' }] },
  } },

  { id: 'DLG_KING', start: 'n1', nodes: {
    n1: { text: '你就是……那位率魔军前来的王？寡人本以为魔物尽皆凶残，未曾想第一个来救人类的，竟是你们。', actions: ['quest:Q3_CH3_DISTRESS', 'quest:Q3_CH3_FIND_CAUSE'], options: [
      { text: '战争为何而起？', to: 'n2' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '精灵说我们偷袭了圣林，我们却说精灵先焚了边境的城。两族的仇恨积了百年，可这仗，来得太过蹊跷。', options: [{ text: '我去查个水落石出。', to: 'end' }] },
  } },

  { id: 'DLG_CHANCELLOR', start: 'n1', nodes: {
    n1: { text: '（微微欠身）魔王陛下大驾光临，臣惶恐。战争之事，还望陛下明察——人类，绝不会是挑起战端的一方。', options: [
      { text: '（总觉得此人言不由衷）', to: 'end' },
    ] },
  } },

  { id: 'DLG_ELF_LORD', start: 'n1', nodes: {
    n1: { text: '（精灵长老抬眸）百年未见，昔日渔村的少年，如今已是万魔之王。你此来，是为何？', actions: ['quest:Q3_CH3_MEDIATE', 'quest:Q3S_ELF', 'quest:Q3_CH3_FINAL'], options: [
      { text: '我来阻止这场无谓的战争。', to: 'n2' },
      { text: '关于战争之主……', to: 'n3' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '魔物之言，本座不敢轻信。你若真有诚意，便去圣林斩两只合成兽——那是被邪气驱使的可怜兽。', options: [{ text: '一言为定。', to: 'end' }] },
    n3: { text: '圣树祭坛的地脉，被人注入了邪气。那是远古的存在——战争之主的手笔。它以三族的鲜血为食。', options: [{ text: '……原来如此。', to: 'end' }] },
  } },

  { id: 'DLG_ELF_SENTINEL', start: 'n1', nodes: {
    n1: { text: '（精灵哨兵拉满弓，随即放下）魔物……哼。长老说你是来调停的。那就证明给我看——圣林外的战争傀儡，正等着你呢。', actions: ['quest:Q3S_TRUST'], options: [
      { text: '乐意奉陪。', to: 'n2' },
      { text: '（告辞）', to: 'end' },
    ] },
    n2: { text: '……哼，还算有点胆色。', options: [{ text: '……', to: 'end' }] },
  } },

  { id: 'DLG_ELF_MERCHANT', start: 'n1', nodes: {
    n1: { text: '（薇安浅笑）圣树的果实、魔药的配方，我这儿都有。', options: [
      { text: '看看货', to: 'n_shop' },
      { text: '（告辞）', to: 'end' },
    ] },
    n_shop: { text: '请随意挑选。', actions: ['shop:SHOP_ELF'], options: [{ text: '（离开商会）', to: 'end' }] },
  } },
];
