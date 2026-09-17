const fs = require('fs');
const path = require('path');

const localesDir = path.join(process.cwd(), 'public', 'locales');

const translations = {
  b2b2_reviews_h2: {
    ru: 'Что говорят владельцы бизнеса?',
    en: 'What do business owners say?',
    uk: 'Що кажуть власники бізнесу?',
    tr: 'İşletme sahipleri ne diyor?',
    ka: 'რას ამბობენ ბიზნესის მფლობელები?',
    vi: 'Chủ doanh nghiệp nói gì?',
    ar: 'ماذا يقول أصحاب الأعمال؟'
  },
  b2b2_reviews_1_name: {
    ru: 'Александр В., Владелец ресторана',
    en: 'Alexander V., Restaurant Owner',
    uk: 'Олександр В., Власник ресторану',
    tr: 'Alexander V., Restoran Sahibi',
    ka: 'ალექსანდრე ვ., რესტორნის მფლობელი',
    vi: 'Alexander V., Chủ nhà hàng',
    ar: 'ألكسندر ف.، صاحب مطعم'
  },
  b2b2_reviews_1_text: {
    ru: 'За месяц мы собрали больше отзывов, чем за весь прошлый год. Рейтинг вырос с 4.2 до 4.6, и мы уже видим приток новых гостей с Google Карт.',
    en: 'In a month we collected more reviews than in the entire past year. The rating grew from 4.2 to 4.6, and we already see an influx of new guests from Google Maps.',
    uk: 'За місяць ми зібрали більше відгуків, ніж за весь минулий рік. Рейтинг зріс з 4.2 до 4.6, і ми вже бачимо приплив нових гостей з Google Карт.',
    tr: 'Bir ay içinde tüm geçen yıldan daha fazla inceleme topladık. Puan 4.2\'den 4.6\'ya yükseldi ve şimdiden Google Haritalar\'dan yeni misafir akışı görüyoruz.',
    ka: 'ერთ თვეში ჩვენ შევაგროვეთ მეტი მიმოხილვა, ვიდრე მთელი გასული წლის განმავლობაში. რეიტინგი გაიზარდა 4.2-დან 4.6-მდე და უკვე ვხედავთ ახალი სტუმრების შემოდინებას Google Maps-დან.',
    vi: 'Trong một tháng, chúng tôi đã thu thập được nhiều đánh giá hơn so với toàn bộ năm ngoái. Đánh giá đã tăng từ 4.2 lên 4.6 và chúng tôi đã thấy một lượng khách mới từ Google Maps.',
    ar: 'في شهر واحد جمعنا مراجعات أكثر من العام الماضي بأكمله. نما التقييم من 4.2 إلى 4.6، ونرى بالفعل تدفق ضيوف جدد من خرائط Google.'
  },
  b2b2_reviews_2_name: {
    ru: 'Мария С., Сеть кофеен',
    en: 'Maria S., Coffee Shop Chain',
    uk: 'Марія С., Мережа кав\'ярень',
    tr: 'Maria S., Kahve Dükkanı Zinciri',
    ka: 'მარია ს., ყავის მაღაზიების ქსელი',
    vi: 'Maria S., Chuỗi quán cà phê',
    ar: 'ماريا س.، سلسلة مقاهي'
  },
  b2b2_reviews_2_text: {
    ru: 'Система Revoo буквально спасла нас от потребительского терроризма. Весь негатив теперь уходит мне в Telegram, а гости довольны, что мы моментально решаем их проблемы. Оборот вырос на 15%.',
    en: 'The Revoo system literally saved us from consumer terrorism. All negativity now goes to my Telegram, and guests are happy that we instantly solve their problems. Turnover grew by 15%.',
    uk: 'Система Revoo буквально врятувала нас від споживчого тероризму. Весь негатив тепер іде мені в Telegram, а гості задоволені, що ми миттєво вирішуємо їхні проблеми. Обіг зріс на 15%.',
    tr: 'Revoo sistemi bizi kelimenin tam anlamıyla tüketici terörizminden kurtardı. Artık tüm olumsuzluklar Telegram\'ıma gidiyor ve misafirler sorunlarını anında çözdüğümüz için mutlu. Ciro %15 arttı.',
    ka: 'Revoo სისტემამ ფაქტიურად გადაგვარჩინა სამომხმარებლო ტერორიზმისგან. მთელი ნეგატივი ახლა მიდის ჩემს Telegram-ში და სტუმრები კმაყოფილნი არიან, რომ ჩვენ მყისიერად ვაგვარებთ მათ პრობლემებს. ბრუნვა გაიზარდა 15%-ით.',
    vi: 'Hệ thống Revoo theo đúng nghĩa đen đã cứu chúng tôi khỏi khủng bố người tiêu dùng. Mọi tiêu cực hiện được gửi đến Telegram của tôi và khách hàng rất vui vì chúng tôi giải quyết vấn đề của họ ngay lập tức. Doanh thu tăng 15%.',
    ar: 'لقد أنقذنا نظام Revoo حرفياً من إرهاب المستهلك. كل السلبيات تذهب الآن إلى Telegram الخاص بي، والضيوف سعداء لأننا نحل مشاكلهم على الفور. نما حجم المبيعات بنسبة 15%.'
  },
  b2b2_reviews_3_name: {
    ru: 'Дмитрий К., Барбершоп',
    en: 'Dmitry K., Barbershop',
    uk: 'Дмитро К., Барбершоп',
    tr: 'Dmitry K., Berber',
    ka: 'დიმიტრი კ., ბარბერშოპი',
    vi: 'Dmitry K., Tiệm cắt tóc',
    ar: 'دميتري ك.، صالون حلاقة'
  },
  b2b2_reviews_3_text: {
    ru: 'Раньше мы раздавали картонные визитки с печатками, которые никто не носил. Сейчас 98% клиентов сканируют QR-код на зеркале, а тающая скидка заставляет их стричься каждые 3 недели, а не раз в месяц.',
    en: 'We used to give out cardboard cards with stamps that no one carried. Now 98% of clients scan the QR code on the mirror, and the melting discount makes them get a haircut every 3 weeks instead of once a month.',
    uk: 'Раніше ми роздавали картонні візитки з печатками, які ніхто не носив. Зараз 98% клієнтів сканують QR-код на дзеркалі, а таюча знижка змушує їх стригтися кожні 3 тижні, а не раз на місяць.',
    tr: 'Eskiden kimsenin taşımadığı damgalı karton kartlar verirdik. Şimdi müşterilerin %98\'i aynadaki QR kodunu tarıyor ve eriyen indirim onların ayda bir yerine her 3 haftada bir saç kestirmelerini sağlıyor.',
    ka: 'ადრე ვარიგებდით მუყაოს ბარათებს ბეჭდებით, რომლებსაც არავინ ატარებდა. ახლა კლიენტების 98% სკანირებს QR კოდს სარკეზე და მდნარი ფასდაკლება აიძულებს მათ თმა შეიჭრან ყოველ 3 კვირაში ერთხელ, ნაცვლად თვეში ერთხელ.',
    vi: 'Chúng tôi từng phát các thẻ giấy có con dấu mà không ai mang theo. Bây giờ 98% khách hàng quét mã QR trên gương và chiết khấu tan chảy khiến họ cắt tóc 3 tuần một lần thay vì mỗi tháng một lần.',
    ar: 'كنا نوزع بطاقات من الورق المقوى عليها أختام لا يحملها أحد. الآن 98% من العملاء يقومون بمسح رمز QR الموجود على المرآة، والخصم الذائب يجعلهم يحصلون على قصة شعر كل 3 أسابيع بدلاً من مرة كل شهر.'
  }
};

const langs = ['ru', 'en', 'uk', 'tr', 'ka', 'vi', 'ar'];

langs.forEach(lang => {
  const filePath = path.join(localesDir, lang, 'translation.json');
  if (fs.existsSync(filePath)) {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const key in translations) {
      if (translations[key][lang]) {
        data[key] = translations[key][lang];
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}/translation.json`);
  }
});
