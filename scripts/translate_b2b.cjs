const fs = require('fs');
const path = require('path');

const localesDir = path.join(process.cwd(), 'public', 'locales');

const translations = {
  b2b2_nav_cta: {
    ru: 'ПОДКЛЮЧИТЬ МОЙ БИЗНЕС',
    en: 'CONNECT MY BUSINESS',
    uk: 'ПІДКЛЮЧИТИ МІЙ БІЗНЕС',
    tr: 'İŞLETMEMİ BAĞLA',
    ka: 'ჩემი ბიზნესის დაკავშირება',
    vi: 'KẾT NỐI DOANH NGHIỆP CỦA TÔI',
    ar: 'ربط عملي'
  },
  bc_home: {
    ru: 'Главная',
    en: 'Home',
    uk: 'Головна',
    tr: 'Ana Sayfa',
    ka: 'მთავარი',
    vi: 'Trang chủ',
    ar: 'الرئيسية'
  },
  bc_b2b: {
    ru: 'B2B Решения',
    en: 'B2B Solutions',
    uk: 'B2B Рішення',
    tr: 'B2B Çözümleri',
    ka: 'B2B გადაწყვეტილებები',
    vi: 'Giải pháp B2B',
    ar: 'حلول B2B'
  },
  bc_local_domination: {
    ru: 'Система Локального Доминирования',
    en: 'Local Domination System',
    uk: 'Система Локального Домінування',
    tr: 'Yerel Hakimiyet Sistemi',
    ka: 'ლოკალური დომინირების სისტემა',
    vi: 'Hệ thống Thống trị Địa phương',
    ar: 'نظام السيطرة المحلية'
  },
  b2b2_hero_tag: {
    ru: 'Система локального доминирования',
    en: 'Local Domination System',
    uk: 'Система локального домінування',
    tr: 'Yerel Hakimiyet Sistemi',
    ka: 'ლოკალური დომინირების სისტემა',
    vi: 'Hệ thống Thống trị Địa phương',
    ar: 'نظام السيطرة المحلية'
  },
  b2b2_hero_h1: {
    ru: 'Хватит сливать бюджет на рекламу. Превратите Google Карты в бесконечный поток постоянных гостей.',
    en: 'Stop wasting budget on ads. Turn Google Maps into an endless stream of loyal guests.',
    uk: 'Досить зливати бюджет на рекламу. Перетворіть Google Карти на нескінченний потік постійних гостей.',
    tr: 'Reklam bütçenizi boşa harcamayı bırakın. Google Haritalar\'ı sonsuz bir sadık müşteri akışına dönüştürün.',
    ka: 'შეწყვიტეთ ბიუჯეტის ხარჯვა რეკლამებზე. აქციეთ Google Maps ერთგული სტუმრების უსასრულო ნაკადად.',
    vi: 'Ngừng lãng phí ngân sách cho quảng cáo. Biến Google Maps thành một luồng khách hàng trung thành vô tận.',
    ar: 'توقف عن إهدار الميزانية على الإعلانات. حوّل خرائط Google إلى تيار لا نهاية له من الضيوف الدائمين.'
  },
  b2b2_hero_sub: {
    ru: 'В 2026 году таргетинг стоит космических денег, а баннеры вызывают баннеровую слепоту. Мы внедряем Систему Локального Доминирования: выводим ваш бизнес в Топ Google Картах, оцифровываем каждый визит и заставляем клиентов возвращаться снова и снова — без затрат на платную рекламу.',
    en: 'In 2026, targeting costs cosmic money, and banners cause banner blindness. We implement the Local Domination System: we bring your business to the Top of Google Maps, digitize every visit, and make clients return again and again — without spending on paid ads.',
    uk: 'У 2026 році таргетинг коштує космічних грошей, а банери викликають банерну сліпоту. Ми впроваджуємо Систему Локального Домінування: виводимо ваш бізнес у Топ на Google Картах, оцифровуємо кожен візит і змушуємо клієнтів повертатися знову і знову — без витрат на платну рекламу.',
    tr: '2026\'da hedefleme kozmik paralara mal oluyor ve afişler körlüğe neden oluyor. Yerel Hakimiyet Sistemini uyguluyoruz: işletmenizi Google Haritalar\'da en üste taşıyor, her ziyareti dijitalleştiriyor ve müşterilerin ücretli reklamlara para harcamadan tekrar tekrar dönmesini sağlıyoruz.',
    ka: '2026 წელს მიზნობრივი რეკლამა კოსმიური ფული ღირს და ბანერები იწვევს ბანერების სიბრმავეს. ჩვენ ვნერგავთ ლოკალური დომინირების სისტემას: გამოგვყავს თქვენი ბიზნესი ტოპში Google Maps-ზე, ვაციფრულებთ ყოველ ვიზიტს და ვაიძულებთ კლიენტებს დაბრუნდნენ ისევ და ისევ — ფასიანი რეკლამის გარეშე.',
    vi: 'Vào năm 2026, việc nhắm mục tiêu tốn chi phí vũ trụ và biểu ngữ gây mù biểu ngữ. Chúng tôi triển khai Hệ thống Thống trị Địa phương: đưa doanh nghiệp của bạn lên vị trí Hàng đầu của Google Maps, số hóa mọi lượt truy cập và làm cho khách hàng quay lại nhiều lần - mà không cần chi tiêu cho quảng cáo trả tiền.',
    ar: 'في عام 2026، يكلف الاستهداف أموالاً فلكية، وتتسبب اللافتات في عمى اللافتات. نحن نطبق نظام السيطرة المحلية: نرتقي بعملك إلى صدارة خرائط Google، ونجعل كل زيارة رقمية، ونجعل العملاء يعودون مرارًا وتكرارًا - دون الإنفاق على الإعلانات المدفوعة.'
  },
  b2b2_faq_h2: {
    ru: 'Остались вопросы? Давайте разберем главные:',
    en: 'Still have questions? Let\'s break down the main ones:',
    uk: 'Залишилися питання? Давайте розберемо головні:',
    tr: 'Hâlâ sorularınız mı var? Ana olanları inceleyelim:',
    ka: 'კიდევ გაქვთ კითხვები? განვიხილოთ მთავარი კითხვები:',
    vi: 'Vẫn còn câu hỏi? Hãy phân tích những câu chính:',
    ar: 'هل ما زالت لديك أسئلة؟ دعنا نحلل الأسئلة الرئيسية:'
  },
  b2b2_cta_h2: {
    ru: 'Не отдавайте своих клиентов конкурентам.',
    en: 'Don\'t give your clients to competitors.',
    uk: 'Не віддавайте своїх клієнтів конкурентам.',
    tr: 'Müşterilerinizi rakiplerinize kaptırmayın.',
    ka: 'ნუ მისცემთ თქვენს კლიენტებს კონკურენტებს.',
    vi: 'Đừng nhường khách hàng của bạn cho đối thủ cạnh tranh.',
    ar: 'لا تتخلى عن عملائك للمنافسين.'
  },
  b2b2_cta_desc: {
    ru: 'Каждый день промедления — это десятки гостей, которые выбрали другое заведение в Google Картах, потому что у него рейтинг выше, а сервис современнее. Займите место лидера в своем районе.',
    en: 'Every day of delay means dozens of guests choosing another place on Google Maps because it has a higher rating and more modern service. Take the leader\'s place in your area.',
    uk: 'Кожен день зволікання — це десятки гостей, які обрали інший заклад на Google Картах, тому що в нього рейтинг вищий, а сервіс сучасніший. Займіть місце лідера у своєму районі.',
    tr: 'Gecikilen her gün, daha yüksek puanı ve daha modern hizmeti olduğu için Google Haritalar\'da başka bir yeri seçen onlarca misafir anlamına gelir. Bölgenizde liderin yerini alın.',
    ka: 'ყოველდღიური დაყოვნება ნიშნავს ათობით სტუმარს, რომლებმაც აირჩიეს სხვა დაწესებულება Google Maps-ზე, რადგან მას აქვს უფრო მაღალი რეიტინგი და უფრო თანამედროვე მომსახურება. დაიკავეთ ლიდერის ადგილი თქვენს მხარეში.',
    vi: 'Sự chậm trễ mỗi ngày đồng nghĩa với việc hàng chục khách chọn một địa điểm khác trên Google Maps vì địa điểm đó có xếp hạng cao hơn và dịch vụ hiện đại hơn. Hãy chiếm vị trí dẫn đầu trong khu vực của bạn.',
    ar: 'يوميا من التأخير يعني عشرات الضيوف الذين يختارون مكانًا آخر على خرائط Google لأنه يتمتع بتقييم أعلى وخدمة أكثر حداثة. خذ مكان القائد في منطقتك.'
  }
};

const faq_q = [
  { ru: 'Нужно ли моим гостям скачивать приложение?', en: 'Do my guests need to download an app?', uk: 'Чи потрібно моїм гостям завантажувати додаток?', tr: 'Misafirlerimin bir uygulama indirmesi gerekiyor mu?', ka: 'სჭირდებათ ჩემს სტუმრებს აპლიკაციის გადმოწერა?', vi: 'Khách của tôi có cần tải ứng dụng không?', ar: 'هل يحتاج ضيوفي إلى تنزيل تطبيق؟' },
  { ru: 'Как защищается мой рейтинг?', en: 'How is my rating protected?', uk: 'Як захищається мій рейтинг?', tr: 'Derecelendirmem nasıl korunuyor?', ka: 'როგორ დაცულია ჩემი რეიტინგი?', vi: 'Xếp hạng của tôi được bảo vệ như thế nào?', ar: 'كيف يتم حماية تقييمي؟' },
  { ru: 'У нас уже есть скидочные карты. Зачем нам это?', en: 'We already have discount cards. Why do we need this?', uk: 'У нас вже є знижкові картки. Навіщо нам це?', tr: 'Zaten indirim kartlarımız var. Buna neden ihtiyacımız var?', ka: 'ჩვენ უკვე გვაქვს ფასდაკლების ბარათები. რატომ გვჭირდება ეს?', vi: 'Chúng tôi đã có thẻ giảm giá. Tại sao chúng tôi cần điều này?', ar: 'لدينا بالفعل بطاقات خصم. لماذا نحتاج هذا؟' },
  { ru: 'Как быстро мы увидим результат?', en: 'How fast will we see results?', uk: 'Як швидко ми побачимо результат?', tr: 'Sonuçları ne kadar hızlı göreceğiz?', ka: 'რამდენად სწრაფად ვნახავთ შედეგს?', vi: 'Chúng tôi sẽ thấy kết quả nhanh như thế nào?', ar: 'ما مدى سرعة رؤيتنا للنتائج؟' },
  { ru: 'Как работает "тающая" скидка?', en: 'How does the "melting" discount work?', uk: 'Як працює "таюча" знижка?', tr: '"Eriyen" indirim nasıl çalışır?', ka: 'როგორ მუშაობს "მდნარი" ფასდაკლება?', vi: 'Khuyến mãi "tan chảy" hoạt động như thế nào?', ar: 'كيف يعمل خصم "الذوبان"؟' },
  { ru: 'Смогу ли я управлять базой гостей?', en: 'Will I be able to manage the guest base?', uk: 'Чи зможу я керувати базою гостей?', tr: 'Misafir tabanını yönetebilecek miyim?', ka: 'შევძლებ თუ არა სტუმრების ბაზის მართვას?', vi: 'Tôi có thể quản lý cơ sở khách hàng không?', ar: 'هل سأتمكن من إدارة قاعدة الضيوف؟' },
  { ru: 'Требуется ли установка сложного оборудования?', en: 'Is complex equipment installation required?', uk: 'Чи потрібне встановлення складного обладнання?', tr: 'Karmaşık ekipman kurulumu gerekiyor mu?', ka: 'საჭიროა თუ არა რთული აღჭურვილობის ინსტალაცია?', vi: 'Có cần cài đặt thiết bị phức tạp không?', ar: 'هل يتطلب تثبيت معدات معقدة؟' },
  { ru: 'Что, если гость не захочет оставлять данные?', en: 'What if the guest doesn\'t want to leave data?', uk: 'Що, якщо гість не захоче залишати дані?', tr: 'Misafir veri bırakmak istemezse ne olur?', ka: 'რა მოხდება, თუ სტუმარს არ სურს მონაცემების დატოვება?', vi: 'Điều gì xảy ra nếu khách không muốn để lại dữ liệu?', ar: 'ماذا لو لم يرغب الضيف في ترك البيانات؟' },
  { ru: 'Будет ли это работать в моей стране?', en: 'Will it work in my country?', uk: 'Чи буде це працювати в моїй країні?', tr: 'Benim ülkemde çalışacak mı?', ka: 'იმუშავებს ეს ჩემს ქვეყანაში?', vi: 'Nó có hoạt động ở quốc gia của tôi không?', ar: 'هل سيعمل في بلدي؟' },
  { ru: 'Почему именно Google Карты?', en: 'Why Google Maps exactly?', uk: 'Чому саме Google Карти?', tr: 'Neden özellikle Google Haritalar?', ka: 'რატომ მაინცდამაინც Google Maps?', vi: 'Tại sao lại là Google Maps?', ar: 'لماذا خرائط Google بالضبط؟' },
  { ru: 'Взимается ли комиссия за каждого гостя?', en: 'Is there a commission per guest?', uk: 'Чи стягується комісія за кожного гостя?', tr: 'Her misafir için bir komisyon var mı?', ka: 'არის თუ არა საკომისიო თითოეულ სტუმარზე?', vi: 'Có hoa hồng cho mỗi khách không?', ar: 'هل هناك عمولة لكل ضيف؟' },
  { ru: 'Можно ли интегрировать Revoo с кассой (iiko, r_keeper)?', en: 'Can Revoo be integrated with POS (iiko, r_keeper)?', uk: 'Чи можна інтегрувати Revoo з касою (iiko, r_keeper)?', tr: 'Revoo POS (iiko, r_keeper) ile entegre edilebilir mi?', ka: 'შეიძლება Revoo-ს ინტეგრირება POS-თან (iiko, r_keeper)?', vi: 'Revoo có thể tích hợp với POS (iiko, r_keeper) không?', ar: 'هل يمكن دمج Revoo مع نقطة البيع (iiko، r_keeper)؟' },
  { ru: 'Как происходит защита персональных данных?', en: 'How is personal data protected?', uk: 'Як відбувається захист персональних даних?', tr: 'Kişisel veriler nasıl korunuyor?', ka: 'როგორ არის დაცული პერსონალური მონაცემები?', vi: 'Dữ liệu cá nhân được bảo vệ như thế nào?', ar: 'كيف يتم حماية البيانات الشخصية؟' },
  { ru: 'Нужно ли нанимать маркетолога для работы с Revoo?', en: 'Do I need to hire a marketer to work with Revoo?', uk: 'Чи потрібно наймати маркетолога для роботи з Revoo?', tr: 'Revoo ile çalışmak için bir pazarlamacı tutmam gerekiyor mu?', ka: 'მჭირდება თუ არა მარკეტოლოგის დაქირავება Revoo-სთან სამუშაოდ?', vi: 'Tôi có cần thuê một nhà tiếp thị để làm việc với Revoo không?', ar: 'هل أحتاج إلى توظيف مسوق للعمل مع Revoo؟' },
  { ru: 'Подходит ли это для сети заведений?', en: 'Is it suitable for a chain of establishments?', uk: 'Чи підходить це для мережі закладів?', tr: 'Bir işletme zinciri için uygun mu?', ka: 'არის თუ არა შესაფერისი დაწესებულებების ქსელისთვის?', vi: 'Nó có phù hợp cho một chuỗi cơ sở không?', ar: 'هل هو مناسب لسلسلة من المؤسسات؟' },
  { ru: 'Как происходит оплата подписки?', en: 'How is the subscription paid?', uk: 'Як відбувається оплата підписки?', tr: 'Abonelik nasıl ödenir?', ka: 'როგორ ხდება გამოწერის გადახდა?', vi: 'Thanh toán đăng ký như thế nào?', ar: 'كيف يتم دفع الاشتراك؟' }
];

const faq_a = [
  { ru: 'Абсолютно нет. Система работает мгновенно в браузере или Telegram (Zero Friction).', en: 'Absolutely not. The system works instantly in the browser or Telegram (Zero Friction).', uk: 'Абсолютно ні. Система працює миттєво в браузері або Telegram (Zero Friction).', tr: 'Kesinlikle hayır. Sistem tarayıcıda veya Telegram\'da anında çalışır (Sıfır Sürtünme).', ka: 'აბსოლუტურად არა. სისტემა მუშაობს მყისიერად ბრაუზერში ან Telegram-ში (Zero Friction).', vi: 'Hoàn toàn không. Hệ thống hoạt động tức thì trong trình duyệt hoặc Telegram (Zero Friction).', ar: 'إطلاقاً. يعمل النظام فورًا في المتصفح أو تطبيق Telegram (احتكاك صفري).' },
  { ru: 'Умный шлюз перенаправляет 4–5 звезд на Google Карты, а негатив (1–3 звезды) отправляет в закрытый чат руководству.', en: 'A smart gateway redirects 4–5 stars to Google Maps, and negative feedback (1–3 stars) to a private chat for management.', uk: 'Розумний шлюз перенаправляє 4–5 зірок на Google Карти, а негатив (1–3 зірки) відправляє в закритий чат керівництву.', tr: 'Akıllı bir ağ geçidi 4-5 yıldızı Google Haritalar\'a ve olumsuz geri bildirimleri (1-3 yıldız) yönetim için özel bir sohbete yönlendirir.', ka: 'ჭკვიანი კარიბჭე 4-5 ვარსკვლავს მიმართავს Google Maps-ზე, ხოლო უარყოფით გამოხმაურებას (1-3 ვარსკვლავი) დახურულ ჩატში ხელმძღვანელობისთვის.', vi: 'Một cổng thông minh chuyển hướng 4-5 sao đến Google Maps, và phản hồi tiêu cực (1-3 sao) đến một cuộc trò chuyện riêng tư cho ban quản lý.', ar: 'تقوم البوابة الذكية بإعادة توجيه 4-5 نجوم إلى خرائط Google، والملاحظات السلبية (1-3 نجوم) إلى دردشة خاصة للإدارة.' },
  { ru: 'Обычный пластик не продвигает вас на картах и не возвращает гостей через страх потери. Revo — это активный инструмент роста, а не пассивный кусок пластика.', en: 'Standard plastic doesn\'t promote you on maps or bring back guests through loss aversion. Revo is an active growth tool, not a passive piece of plastic.', uk: 'Звичайний пластик не просуває вас на картах і не повертає гостей через страх втрати. Revo — це активний інструмент росту, а не пасивний шматок пластику.', tr: 'Standart plastik sizi haritalarda tanıtmaz veya kayıp korkusu yoluyla misafirleri geri getirmez. Revo, pasif bir plastik parçası değil, aktif bir büyüme aracıdır.', ka: 'ჩვეულებრივი პლასტიკი არ გაწინაურებთ რუკებზე და არ აბრუნებს სტუმრებს დაკარგვის შიშის მეშვეობით. Revo არის ზრდის აქტიური ინსტრუმენტი და არა პლასტიკის პასიური ნაჭერი.', vi: 'Nhựa tiêu chuẩn không quảng bá bạn trên bản đồ hoặc mang lại khách hàng thông qua sự sợ hãi mất mát. Revo là một công cụ tăng trưởng tích cực, không phải là một mảnh nhựa thụ động.', ar: 'البلاستيك القياسي لا يروج لك على الخرائط أو يعيد الضيوف من خلال الخوف من الخسارة. Revo أداة نمو نشطة، وليس قطعة بلاستيك سلبية.' },
  { ru: 'Переходы и оцифровка гостей начнутся в первые дни после оптимизации профиля и интеграции ссылок.', en: 'Transitions and guest digitization will begin in the first few days after profile optimization and link integration.', uk: 'Переходи та оцифрування гостей почнуться в перші дні після оптимізації профілю та інтеграції посилань.', tr: 'Geçişler ve misafir dijitalleştirme, profil optimizasyonundan ve bağlantı entegrasyonundan sonraki ilk günlerde başlayacaktır.', ka: 'გადასვლები და სტუმრების დიგიტალიზაცია დაიწყება პროფილის ოპტიმიზაციისა და ბმულების ინტეგრაციის შემდეგ პირველ დღეებში.', vi: 'Quá trình chuyển đổi và số hóa khách sẽ bắt đầu trong vài ngày đầu tiên sau khi tối ưu hóa hồ sơ và tích hợp liên kết.', ar: 'ستبدأ الانتقالات ورقمنة الضيوف في الأيام القليلة الأولى بعد تحسين الملف الشخصي وتكامل الروابط.' },
  { ru: 'В основе лежит поведенческая экономика (Loss Aversion). Если гость долго не приходит, его статус падает. Это вызывает естественное желание "сохранить" накопленное, стимулируя визит.', en: 'It\'s based on behavioral economics (Loss Aversion). If a guest hasn\'t visited for a long time, their status drops. This causes a natural desire to "save" the accumulated perks, stimulating a visit.', uk: 'В основі лежить поведінкова економіка (Loss Aversion). Якщо гість довго не приходить, його статус падає. Це викликає природне бажання "зберегти" накопичене, стимулюючи візит.', tr: 'Davranışsal ekonomiye (Kayıptan Kaçınma) dayanmaktadır. Bir misafir uzun süredir ziyaret etmediyse durumu düşer. Bu, birikmiş ayrıcalıkları "kaybetmeme" isteği uyandırarak ziyareti teşvik eder.', ka: 'ის ეფუძნება ქცევით ეკონომიკას (დაკარგვის შიში). თუ სტუმარი დიდი ხანია არ მოსულა, მისი სტატუსი ეცემა. ეს იწვევს დაგროვილის "შენარჩუნების" ბუნებრივ სურვილს, რაც ხელს უწყობს ვიზიტს.', vi: 'Dựa trên kinh tế học hành vi (Sợ mất mát). Nếu một vị khách không ghé thăm trong một thời gian dài, trạng thái của họ sẽ giảm. Điều này gây ra mong muốn tự nhiên để "lưu giữ" những đặc quyền đã tích lũy, kích thích việc ghé thăm.', ar: 'يعتمد على الاقتصاد السلوكي (تجنب الخسارة). إذا لم يزر الضيف لفترة طويلة، تنخفض حالته. هذا يسبب رغبة طبيعية لـ "حفظ" الامتيازات المتراكمة، مما يحفز الزيارة.' },
  { ru: 'Да, вы получаете удобную CRM-панель владельца, где видите каждого гостя, частоту его визитов и средний чек.', en: 'Yes, you get a convenient owner CRM dashboard where you see every guest, their visit frequency, and average receipt.', uk: 'Так, ви отримуєте зручну CRM-панель власника, де бачите кожного гостя, частоту його візитів і середній чек.', tr: 'Evet, her misafiri, ziyaret sıklığını ve ortalama faturasını görebileceğiniz kullanışlı bir işletme sahibi CRM panosu alırsınız.', ka: 'დიახ, თქვენ იღებთ მფლობელის მოსახერხებელ CRM პანელს, სადაც ხედავთ თითოეულ სტუმარს, მათი ვიზიტების სიხშირეს და საშუალო ჩეკს.', vi: 'Có, bạn nhận được một bảng điều khiển CRM chủ sở hữu thuận tiện, nơi bạn thấy từng khách, tần suất ghé thăm của họ và biên lai trung bình.', ar: 'نعم، تحصل على لوحة تحكم CRM مناسبة للمالك حيث ترى كل ضيف وتكرار زيارته ومتوسط الفاتورة.' },
  { ru: 'Нет. Вам достаточно разместить стильный QR-код (тейбл-тент или наклейку) в вашем заведении. Никаких проводов и терминалов.', en: 'No. You just need to place a stylish QR code (table tent or sticker) in your establishment. No wires or terminals.', uk: 'Ні. Вам достатньо розмістити стильний QR-код (тейбл-тент або наклейку) у вашому закладі. Ніяких проводів і терміналів.', tr: 'Hayır. İşletmenize şık bir QR kodu (masa çadırı veya çıkartma) yerleştirmeniz yeterlidir. Kablo veya terminal yok.', ka: 'არა. თქვენ უბრალოდ უნდა განათავსოთ ელეგანტური QR კოდი (მაგიდის კარავი ან სტიკერი) თქვენს დაწესებულებაში. არანაირი სადენები ან ტერმინალები.', vi: 'Không. Bạn chỉ cần đặt một mã QR phong cách (lều bàn hoặc nhãn dán) trong cơ sở của bạn. Không có dây điện hoặc thiết bị đầu cuối.', ar: 'لا. تحتاج فقط إلى وضع رمز QR أنيق (خيمة طاولة أو ملصق) في مؤسستك. لا أسلاك أو أطراف.' },
  { ru: 'Процесс авторизации через Google или Telegram занимает ровно 1 секунду. Без этого скидка просто не активируется, поэтому конверсия в регистрацию составляет 98%.', en: 'The authorization process via Google or Telegram takes exactly 1 second. Without this, the discount is simply not activated, so the conversion to registration is 98%.', uk: 'Процес авторизації через Google або Telegram займає рівно 1 секунду. Без цього знижка просто не активується, тому конверсія в реєстрацію становить 98%.', tr: 'Google veya Telegram üzerinden yetkilendirme işlemi tam 1 saniye sürer. Bu olmadan indirim etkinleştirilmez, bu nedenle kayda dönüşüm %98\'dir.', ka: 'ავტორიზაციის პროცესი Google-ის ან Telegram-ის მეშვეობით ზუსტად 1 წამს იღებს. ამის გარეშე ფასდაკლება უბრალოდ არ აქტიურდება, ამიტომ რეგისტრაციაზე კონვერსია არის 98%.', vi: 'Quá trình xác thực qua Google hoặc Telegram diễn ra trong đúng 1 giây. Nếu không có điều này, chiết khấu sẽ không được kích hoạt, vì vậy tỷ lệ chuyển đổi đăng ký là 98%.', ar: 'تستغرق عملية التفويض عبر Google أو Telegram ثانية واحدة بالضبط. بدون هذا، ببساطة لا يتم تفعيل الخصم، لذلك التحويل إلى التسجيل هو 98%.' },
  { ru: 'Да! Google Карты являются стандартом поиска бизнеса во всём мире, а интерфейс Revoo переведен на популярные языки.', en: 'Yes! Google Maps is the standard for business search worldwide, and the Revoo interface is translated into popular languages.', uk: 'Так! Google Карти є стандартом пошуку бізнесу в усьому світі, а інтерфейс Revoo перекладений на популярні мови.', tr: 'Evet! Google Haritalar dünya çapında işletme arama standardıdır ve Revoo arayüzü popüler dillere çevrilmiştir.', ka: 'დიახ! Google Maps არის ბიზნესის ძიების სტანდარტი მთელ მსოფლიოში და Revoo-ს ინტერფეისი ნათარგმნია პოპულარულ ენებზე.', vi: 'Có! Google Maps là tiêu chuẩn tìm kiếm doanh nghiệp trên toàn thế giới và giao diện Revoo được dịch ra các ngôn ngữ phổ biến.', ar: 'نعم! خرائط Google هي معيار البحث عن الشركات حول العالم، وواجهة Revoo مترجمة إلى اللغات الشائعة.' },
  { ru: 'Это главный источник органического трафика. Чем выше вы в поиске Google Maps, тем больше новых гостей приходят к вам каждый день абсолютно бесплатно.', en: 'It is the main source of organic traffic. The higher you are in Google Maps search, the more new guests come to you every day absolutely for free.', uk: 'Це головне джерело органічного трафіку. Чим вище ви в пошуку Google Maps, тим більше нових гостей приходять до вас щодня абсолютно безкоштовно.', tr: 'Organik trafiğin ana kaynağıdır. Google Haritalar aramasında ne kadar yüksekte olursanız, her gün size tamamen ücretsiz olarak o kadar çok yeni misafir gelir.', ka: 'ეს არის ორგანული ტრაფიკის მთავარი წყარო. რაც უფრო მაღლა ხართ Google Maps-ის ძიებაში, მით მეტი ახალი სტუმარი მოდის თქვენთან ყოველდღიურად აბსოლუტურად უფასოდ.', vi: 'Đó là nguồn lưu lượng truy cập hữu cơ chính. Bạn càng ở vị trí cao trên Google Maps, càng có nhiều khách mới đến với bạn mỗi ngày hoàn toàn miễn phí.', ar: 'إنها المصدر الرئيسي للحركة العضوية. كلما ارتفعت في بحث خرائط Google، كلما زاد عدد الضيوف الجدد الذين يأتوا إليك كل يوم مجانًا تمامًا.' },
  { ru: 'Нет, мы не агрегатор. Вы платите только фиксированную стоимость подписки за использование платформы. Никаких скрытых комиссий с чеков.', en: 'No, we are not an aggregator. You only pay a fixed subscription cost for using the platform. No hidden commissions from checks.', uk: 'Ні, ми не агрегатор. Ви платите тільки фіксовану вартість підписки за використання платформи. Жодних прихованих комісій з чеків.', tr: 'Hayır, biz bir toplayıcı değiliz. Sadece platformu kullanmak için sabit bir abonelik ücreti ödersiniz. Çeklerden gizli komisyon alınmaz.', ka: 'არა, ჩვენ არ ვართ აგრეგატორი. თქვენ იხდით მხოლოდ ფიქსირებულ სააბონენტო გადასახადს პლატფორმის გამოყენებისთვის. არანაირი ფარული საკომისიო ჩეკებიდან.', vi: 'Không, chúng tôi không phải là một công cụ tổng hợp. Bạn chỉ phải trả một chi phí đăng ký cố định để sử dụng nền tảng. Không có hoa hồng ẩn từ các hóa đơn.', ar: 'لا، نحن لسنا مجمعًا. أنت تدفع فقط تكلفة اشتراك ثابتة لاستخدام المنصة. لا عمولات خفية من الشيكات.' },
  { ru: 'Да, архитектура платформы поддерживает интеграции. Вы сможете применять скидку автоматически при сканировании гостем чека или экрана.', en: 'Yes, the platform architecture supports integrations. You will be able to apply the discount automatically when the guest scans a receipt or screen.', uk: 'Так, архітектура платформи підтримує інтеграції. Ви зможете застосовувати знижку автоматично при скануванні гостем чека або екрана.', tr: 'Evet, platform mimarisi entegrasyonları destekler. Misafir bir fiş veya ekranı taradığında indirimi otomatik olarak uygulayabileceksiniz.', ka: 'დიახ, პლატფორმის არქიტექტურა მხარს უჭერს ინტეგრაციას. თქვენ შეძლებთ ფასდაკლების ავტომატურად გამოყენებას, როდესაც სტუმარი სკანირებს ჩეკს ან ეკრანს.', vi: 'Có, kiến trúc nền tảng hỗ trợ tích hợp. Bạn sẽ có thể áp dụng giảm giá tự động khi khách quét biên lai hoặc màn hình.', ar: 'نعم، تدعم هندسة المنصة التكامل. ستتمكن من تطبيق الخصم تلقائيًا عندما يمسح الضيف الإيصال أو الشاشة.' },
  { ru: 'Система работает в строгом соответствии с глобальными стандартами защиты данных (включая GDPR). Данные ваших гостей надежно зашифрованы.', en: 'The system operates in strict compliance with global data protection standards (including GDPR). Your guests\' data is securely encrypted.', uk: 'Система працює в суворій відповідності до глобальних стандартів захисту даних (включаючи GDPR). Дані ваших гостей надійно зашифровані.', tr: 'Sistem küresel veri koruma standartlarına (GDPR dahil) tam uyum içinde çalışır. Misafirlerinizin verileri güvenli bir şekilde şifrelenir.', ka: 'სისტემა მუშაობს გლობალური მონაცემთა დაცვის სტანდარტების (მათ შორის GDPR) მკაცრი დაცვით. თქვენი სტუმრების მონაცემები საიმედოდ არის დაშიფრული.', vi: 'Hệ thống hoạt động tuân thủ nghiêm ngặt các tiêu chuẩn bảo vệ dữ liệu toàn cầu (bao gồm GDPR). Dữ liệu khách của bạn được mã hóa an toàn.', ar: 'يعمل النظام بامتثال صارم لمعايير حماية البيانات العالمية (بما في ذلك GDPR). يتم تشفير بيانات ضيوفك بأمان.' },
  { ru: 'Нет! Платформа работает на автопилоте: сама собирает контакты, сама фильтрует отзывы и сама стимулирует возвраты.', en: 'No! The platform runs on autopilot: it collects contacts itself, filters reviews itself, and stimulates returns itself.', uk: 'Ні! Платформа працює на автопілоті: сама збирає контакти, сама фільтрує відгуки і сама стимулює повернення.', tr: 'Hayır! Platform otopilotta çalışır: kişileri kendisi toplar, incelemeleri kendisi filtreler ve geri dönüşleri kendisi uyarır.', ka: 'არა! პლატფორმა მუშაობს ავტოპილოტზე: თავად აგროვებს კონტაქტებს, თავად ფილტრავს მიმოხილვებს და თავად უწყობს ხელს დაბრუნებას.', vi: 'Không! Nền tảng hoạt động trên chế độ lái tự động: tự thu thập danh bạ, tự lọc đánh giá và tự kích thích quay lại.', ar: 'لا! المنصة تعمل على الطيار الآلي: تجمع جهات الاتصال بنفسها، وتصفي المراجعات بنفسها، وتحفز العوائد بنفسها.' },
  { ru: 'Абсолютно. В кабинете владельца можно управлять как одной точкой, так и целой франшизой, отслеживая эффективность каждого филиала.', en: 'Absolutely. In the owner\'s dashboard, you can manage both a single location and an entire franchise, tracking the effectiveness of each branch.', uk: 'Абсолютно. У кабінеті власника можна управляти як однією точкою, так і цілою франшизою, відстежуючи ефективність кожної філії.', tr: 'Kesinlikle. İşletme sahibi panosunda, hem tek bir konumu hem de tüm bir franchise\'ı yöneterek her şubenin etkinliğini takip edebilirsiniz.', ka: 'აბსოლუტურად. მფლობელის კაბინეტში შეგიძლიათ მართოთ როგორც ერთი წერტილი, ისე მთელი ფრენჩაიზი, თითოეული ფილიალის ეფექტურობის თვალყურის დევნებით.', vi: 'Hoàn toàn. Trong bảng điều khiển của chủ sở hữu, bạn có thể quản lý cả một địa điểm duy nhất và toàn bộ nhượng quyền thương mại, theo dõi hiệu quả của từng chi nhánh.', ar: 'بكل تأكيد. في لوحة معلومات المالك، يمكنك إدارة كل من موقع واحد وامتياز كامل، وتتبع فعالية كل فرع.' },
  { ru: 'Вы можете оплатить сервис удобным для вас способом: банковской картой онлайн или по безналичному расчету (для юр. лиц).', en: 'You can pay for the service in a convenient way for you: by credit card online or by bank transfer (for legal entities).', uk: 'Ви можете оплатити сервіс зручним для вас способом: банківською картою онлайн або за безготівковим розрахунком (для юр. осіб).', tr: 'Hizmet için sizin için uygun bir şekilde ödeme yapabilirsiniz: çevrimiçi kredi kartıyla veya banka havalesiyle (tüzel kişiler için).', ka: 'თქვენ შეგიძლიათ გადაიხადოთ მომსახურება თქვენთვის მოსახერხებელი გზით: საბანკო ბარათით ონლაინ ან საბანკო გადარიცხვით (იურიდიული პირებისთვის).', vi: 'Bạn có thể thanh toán dịch vụ theo cách thuận tiện cho bạn: bằng thẻ tín dụng trực tuyến hoặc chuyển khoản ngân hàng (dành cho pháp nhân).', ar: 'يمكنك دفع ثمن الخدمة بطريقة مريحة لك: عن طريق بطاقة الائتمان عبر الإنترنت أو عن طريق التحويل المصرفي (للكيانات القانونية).' }
];

faq_q.forEach((item, index) => {
  translations[`b2b2_faq_q_${index}`] = item;
});

faq_a.forEach((item, index) => {
  translations[`b2b2_faq_a_${index}`] = item;
});

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
