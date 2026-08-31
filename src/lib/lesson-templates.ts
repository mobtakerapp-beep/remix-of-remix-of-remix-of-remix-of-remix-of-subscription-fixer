export type LessonTemplate = {
  id: string;
  emoji: string;
  nameAr: string;
  nameEn: string;
  grade: number;
  counts: { mcq: number; trueFalse: number; flashcards: number };
  textAr: string;
  textEn: string;
};

export const lessonTemplates: LessonTemplate[] = [
  {
    id: "arabic",
    emoji: "📖",
    nameAr: "اللغة العربية",
    nameEn: "Arabic",
    grade: 5,
    counts: { mcq: 6, trueFalse: 4, flashcards: 6 },
    textAr:
      "عنوان الدرس: أقسام الكلام في اللغة العربية.\n\nتنقسم الكلمة في اللغة العربية إلى ثلاثة أقسام: الاسم وهو ما يدل على إنسان أو حيوان أو نبات أو جماد مثل: محمد، قطة، شجرة، كتاب. والفعل وهو ما يدل على حدث مقترن بزمن، وأنواعه: الماضي والمضارع والأمر. والحرف وهو ما لا يظهر معناه إلا مع غيره مثل: في، من، إلى، على.\n\nأهم النقاط: التمييز بين الاسم والفعل والحرف، علامات الاسم (التنوين، دخول أل، حروف الجر)، أزمنة الفعل الثلاثة، أمثلة تطبيقية من جمل قصيرة.",
    textEn:
      "Lesson title: Parts of speech in Arabic.\n\nArabic words fall into three categories: nouns (people, animals, plants, objects), verbs (past, present, imperative), and particles that only carry meaning with other words such as in, from, to, on.\n\nKey points: telling nouns, verbs and particles apart; noun markers; the three verb tenses; short applied examples.",
  },
  {
    id: "english",
    emoji: "🔤",
    nameAr: "اللغة الإنجليزية",
    nameEn: "English",
    grade: 5,
    counts: { mcq: 6, trueFalse: 4, flashcards: 8 },
    textAr:
      "عنوان الدرس: الأزمنة الإنجليزية البسيطة (Present & Past Simple).\n\nنستخدم المضارع البسيط للتعبير عن الحقائق والعادات اليومية مثل: She goes to school every day. ونستخدم الماضي البسيط للأحداث المنتهية مثل: She went to school yesterday. الأفعال المنتظمة تأخذ ed في الماضي، أما الأفعال غير المنتظمة فلها صيغ خاصة مثل go/went، eat/ate، see/saw.\n\nأهم النقاط: صياغة السؤال والنفي، الكلمات الدالة على كل زمن (every day, yesterday)، قائمة أفعال شائعة.",
    textEn:
      "Lesson title: Present Simple and Past Simple.\n\nWe use the present simple for facts and daily habits: She goes to school every day. We use the past simple for finished actions: She went to school yesterday. Regular verbs add -ed; irregular verbs change form (go/went, eat/ate, see/saw).\n\nKey points: questions and negatives, time signal words (every day, yesterday), a list of common verbs.",
  },
  {
    id: "math",
    emoji: "➗",
    nameAr: "الرياضيات",
    nameEn: "Mathematics",
    grade: 5,
    counts: { mcq: 8, trueFalse: 4, flashcards: 5 },
    textAr:
      "عنوان الدرس: الكسور العادية — المقارنة والجمع.\n\nالكسر يتكوّن من بسط ومقام. الكسور المتكافئة هي كسور مختلفة الشكل ومتساوية القيمة مثل ١/٢ = ٢/٤. لمقارنة كسرين مختلفي المقام نوحّد المقامات باستخدام المضاعف المشترك الأصغر. لجمع الكسور نوحّد المقام ثم نجمع البسوط فقط.\n\nأمثلة: ١/٤ + ٢/٤ = ٣/٤، ١/٣ + ١/٦ = ٣/٦ = ١/٢.\n\nأهم النقاط: البسط والمقام، الكسور المتكافئة، توحيد المقامات، تبسيط الناتج.",
    textEn:
      "Lesson title: Fractions — comparing and adding.\n\nA fraction has a numerator and a denominator. Equivalent fractions look different but have equal value (1/2 = 2/4). To compare fractions with different denominators, find the least common denominator. To add fractions, make denominators equal then add numerators only.\n\nExamples: 1/4 + 2/4 = 3/4, 1/3 + 1/6 = 3/6 = 1/2.\n\nKey points: numerator and denominator, equivalent fractions, common denominators, simplifying results.",
  },
  {
    id: "science",
    emoji: "🔬",
    nameAr: "العلوم",
    nameEn: "Science",
    grade: 5,
    counts: { mcq: 7, trueFalse: 5, flashcards: 7 },
    textAr:
      "عنوان الدرس: دورة الماء في الطبيعة.\n\nتتحرك المياه على الأرض في دورة مستمرة تتضمن: التبخر بفعل حرارة الشمس، والتكاثف حين يبرد بخار الماء ويتحول إلى قطرات تكوّن السحب، والتساقط في صورة مطر أو ثلج أو برد، والتجمع في البحار والأنهار والمياه الجوفية.\n\nأهم النقاط: مصدر الطاقة في الدورة هو الشمس، حالات الماء الثلاث، أهمية الدورة للنباتات والإنسان، أثر تلوث الماء.",
    textEn:
      "Lesson title: The water cycle.\n\nWater moves in a continuous cycle: evaporation driven by the sun's heat, condensation when vapour cools into droplets forming clouds, precipitation as rain, snow or hail, and collection in seas, rivers and groundwater.\n\nKey points: the sun powers the cycle, the three states of water, why the cycle matters for plants and people, effects of water pollution.",
  },
  {
    id: "social",
    emoji: "🌍",
    nameAr: "الدراسات الاجتماعية",
    nameEn: "Social studies",
    grade: 6,
    counts: { mcq: 6, trueFalse: 5, flashcards: 6 },
    textAr:
      "عنوان الدرس: الموقع الجغرافي وأثره على حياة السكان.\n\nيؤثر الموقع الجغرافي في المناخ والأنشطة الاقتصادية وطرق التجارة. المناطق الساحلية تعتمد على الصيد والتجارة البحرية والموانئ، بينما تعتمد المناطق الداخلية على الزراعة والرعي. تساعد الخرائط وخطوط الطول ودوائر العرض على تحديد المواقع.\n\nأهم النقاط: أهمية الموقع، أثر المناخ على السكان، الأنشطة الاقتصادية، قراءة الخريطة ومفتاحها.",
    textEn:
      "Lesson title: Geographic location and its effect on people's lives.\n\nLocation shapes climate, economic activity and trade routes. Coastal regions rely on fishing, sea trade and ports, while inland regions rely on farming and herding. Maps, longitude and latitude help pinpoint places.\n\nKey points: why location matters, climate's effect on people, economic activities, reading a map and its legend.",
  },
  {
    id: "islamic",
    emoji: "🕌",
    nameAr: "التربية الإسلامية",
    nameEn: "Islamic studies",
    grade: 4,
    counts: { mcq: 6, trueFalse: 5, flashcards: 5 },
    textAr:
      "عنوان الدرس: آداب التعامل مع الآخرين.\n\nحثّ الإسلام على حسن الخُلق مع الوالدين والمعلمين والأصدقاء: إلقاء السلام، والصدق في الحديث، وحفظ اللسان عن الغيبة والكذب، والرحمة بالصغير واحترام الكبير، والوفاء بالوعد، والتعاون على الخير.\n\nأهم النقاط: معنى حسن الخُلق، أمثلة عملية في المدرسة والبيت، ثمار الأخلاق الحسنة، آداب السلام والاستئذان.",
    textEn:
      "Lesson title: Good manners with others.\n\nIslam encourages good character with parents, teachers and friends: greeting others, honesty, guarding the tongue from gossip and lies, mercy to the young and respect for elders, keeping promises, and cooperating in good deeds.\n\nKey points: the meaning of good character, practical examples at school and home, the fruits of good manners, etiquette of greeting and asking permission.",
  },
];
