// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get appName => 'Friendly Code';

  @override
  String get loginTitle => 'С возвращением';

  @override
  String get loginSubtitle => 'Войдите, чтобы управлять вашим заведением.';

  @override
  String get googleSignIn => 'Войти через Google';

  @override
  String get ownerDashboard => 'Панель владельца';

  @override
  String get adminDashboard => 'Панель админа';

  @override
  String get settings => 'Настройки';

  @override
  String get language => 'Язык';

  @override
  String get logout => 'Выйти';

  @override
  String get metrics => 'МЕТРИКИ ЗА СЕГОДНЯ';

  @override
  String get totalCheckins => 'Всего посещений';

  @override
  String get avgReturn => 'Средний возврат';

  @override
  String get discountDist => 'РАСПРЕДЕЛЕНИЕ СКИДОК';

  @override
  String get tier1 => 'Уровень 1 (20%)';

  @override
  String get tier2 => 'Уровень 2 (15%)';

  @override
  String get tier3 => 'Уровень 3 (10%)';

  @override
  String get expired => 'ИСТЕКЛО';

  @override
  String get management => 'УПРАВЛЕНИЕ';

  @override
  String get venueProfile => 'Профиль заведения';

  @override
  String get venueProfileSub => 'Название, время, фото';

  @override
  String get configRules => 'Настройка правил';

  @override
  String get configRulesSub => 'Сроки и проценты скидок';

  @override
  String get marketingBlast => 'Рассылка предложений';

  @override
  String get marketingBlastSub => 'Для возврата клиентов';

  @override
  String get adminConsole => 'КОНСОЛЬ СУПЕРАДМИНА';

  @override
  String get platformOverview => 'Обзор платформы';

  @override
  String get totalVenues => 'Всего заведений';

  @override
  String get totalGuests => 'Всего гостей';

  @override
  String get pendingApproval => 'Ожидают одобрения';

  @override
  String get activeVenues => 'Активные заведения';

  @override
  String get manage => 'УПРАВЛЯТЬ';

  @override
  String get venues => 'Заведения';

  @override
  String get users => 'Пользователи';

  @override
  String get systemStats => 'Статистика системы';

  @override
  String get rewardLogicConfig => 'Конфигурация наград';

  @override
  String get configTierLimit => 'Настройте до 5 временных уровней.';

  @override
  String get addTier => 'Добавить уровень';

  @override
  String get retentionBase => 'База удержания (Просрочено)';

  @override
  String get rewardPercent => 'Скидка %';

  @override
  String get tierHint =>
      'Применяется, когда время последнего визита выше лимита.';

  @override
  String get saveLogic => 'СОХРАНИТЬ';

  @override
  String get logicUpdated => 'Настройки обновлены!';

  @override
  String get visitWithinHrs => 'Визит в течение (ч)';

  @override
  String tierLabel(int index) {
    return 'Уровень $index';
  }

  @override
  String get marketingTitle => 'Маркетинг-рассылка';

  @override
  String get marketingDesc =>
      'Отправьте уведомление клиентам, которые давно не заходили.';

  @override
  String get sendBlast => 'ОТПРАВИТЬ';

  @override
  String get blastSuccess => 'Рассылка выполнена!';

  @override
  String get editVenueProfile => 'Редактировать профиль';

  @override
  String get venueEditor => 'Редактор заведения';

  @override
  String get guestPortalLanguage => 'Язык гостевого портала';

  @override
  String get guestPortalLanguageDescription =>
      'Выберите язык, который гости увидят по умолчанию при сканировании вашего QR-кода.';

  @override
  String get venueName => 'Название заведения';

  @override
  String get description => 'Описание';

  @override
  String get workingHours => 'Часы работы';

  @override
  String get instagram => 'Инстаграм';

  @override
  String get saveChanges => 'СОХРАНИТЬ ИЗМЕНЕНИЯ';

  @override
  String get profileUpdated => 'Профиль обновлен';

  @override
  String get tapToChangeCover => 'Нажмите, чтобы изменить фото';

  @override
  String get uploadPhoto => 'Загрузка фото';

  @override
  String get posStickerGenerator => 'Генератор POS-наклеек';

  @override
  String get posStickerSub => 'Печать наклеек на столы';

  @override
  String get guestDatabase => 'БАЗА ГОСТЕЙ';

  @override
  String get guestDatabaseSub =>
      'Список гостей, которые взаимодействовали с вашим заведением.';

  @override
  String get staffManagement => 'Управление персоналом';

  @override
  String get staffManagementSub => 'Ваши сотрудники';

  @override
  String get downloadHighRes => 'СКАЧАТЬ МАКЕТ';

  @override
  String get stickerInstantDiscount => 'Мгновенная скидка.';

  @override
  String get stickerNoApps => 'Без приложений и анкет.';

  @override
  String stickerToday(int percent) {
    return 'Сегодня: $percent%';
  }

  @override
  String stickerTomorrow(int percent) {
    return 'Завтра: $percent%';
  }

  @override
  String get shareToClients => 'ПОДЕЛИТЬСЯ С КЛИЕНТАМИ';

  @override
  String get downloadQr => 'СКАЧАТЬ QR';

  @override
  String get myDashboard => 'МОЙ ДАШБОРД';

  @override
  String switchVenue(int count) {
    return 'СМЕНИТЬ ЗАВЕДЕНИЕ ($count)';
  }

  @override
  String welcomeBackHeadline(int percent) {
    return 'С возвращением! 🌟\nВаша награда СЕГОДНЯ: $percent%';
  }

  @override
  String get welcomeBackSubhead => 'Чем чаще вы заходите, тем выше награда.';

  @override
  String rewardTodayHeadline(int percent) {
    return 'Ваша награда\nСЕГОДНЯ: $percent%';
  }

  @override
  String get rewardTodaySubhead => 'Хотите 20%? Заходите завтра!';

  @override
  String get getReward => 'ПОЛУЧИТЬ НАГРАДУ';

  @override
  String get venueNotFound => 'Заведение не найдено';

  @override
  String get venueNotFoundSub =>
      'Ссылка недействительна или заведение больше не активно.';

  @override
  String get goToHome => 'НА ГЛАВНУЮ';

  @override
  String get b2bHeroH1 => 'Привлечь гостя — дорого. Удержать — бесценно.';

  @override
  String get b2bHeroSub =>
      'Единственная «умная» система лояльности, которая увеличивает реальную прибыль заведения на 25%. Мы превращаем прохожих в Super VIP клиентов за 24 часа. Без разработки приложений. Без пластика. Без усилий.';

  @override
  String get b2bHeadline => 'Лояльность без трения';

  @override
  String get getTheApp => 'Скачать приложение Friendly Code';

  @override
  String get downloadOn => 'Скачать в';

  @override
  String get accessDeniedAdmin =>
      'Доступ запрещен: у вас нет прав администратора.';

  @override
  String loginFailed(String error) {
    return 'Ошибка входа: $error';
  }

  @override
  String timelineItem(String time, int percent) {
    return '$time: $percent%';
  }

  @override
  String get timelineToday => 'Сегодня';

  @override
  String get timelineTomorrow => 'Завтра';

  @override
  String timelineInDays(int count) {
    return 'Через $count дн.';
  }

  @override
  String get almostThere => 'Почти готово!';

  @override
  String get introduceYourself =>
      'Пожалуйста, представьтесь, чтобы получить награду.';

  @override
  String get yourName => 'ВАШЕ ИМЯ';

  @override
  String get nameHint => 'напр., Алекс';

  @override
  String get yourEmail => 'ВАШ EMAIL';

  @override
  String get emailHint => 'name@example.com';

  @override
  String thanksForVisiting(String name) {
    return 'Спасибо за визит,\n$name!';
  }

  @override
  String get specialTreat => 'Вот ваш подарок.';

  @override
  String get currentDiscount => 'ТЕКУЩАЯ СКИДКА';

  @override
  String get offTotalBill => 'ОТ ОБЩЕГО СЧЕТА';

  @override
  String get getMyGift => 'ПОЛУЧИТЬ ПОДАРОК';

  @override
  String get showStaff =>
      'Покажите этот экран персоналу\nпри оплате, чтобы применить скидку.';

  @override
  String get tapWhenReady =>
      'Нажмите кнопку выше,\nкогда будете готовы к оплате.';

  @override
  String get marketingAudience => 'Выбор аудитории';

  @override
  String get marketingAudienceSub => 'Выберите, кто получит ваше сообщение.';

  @override
  String get marketingMessage => 'Содержание сообщения';

  @override
  String get marketingMessageSub => 'Напишите убедительную причину вернуться.';

  @override
  String get campaignTitle => 'Заголовок кампании';

  @override
  String get campaignTitleHint => 'Скидка 20% на бранч в выходные!';

  @override
  String get messageBody => 'Текст сообщения';

  @override
  String get messageBodyHint =>
      'Привет! Мы скучаем. Покажите это сообщение и получите бесплатный кофе к вашему заказу! ☕';

  @override
  String get campaignImage => 'ИЗОБРАЖЕНИЕ КАМПАНИИ (ОПЦИОНАЛЬНО)';

  @override
  String get actionLink => 'Ссылка на действие (опционально)';

  @override
  String get actionLinkHint => 'https://menu.link/specials';

  @override
  String get frequencyWarning =>
      'Кампании ограничены 1 разом в неделю для обеспечения высокой доставляемости.';

  @override
  String get preparing => 'ПОДГОТОВКА...';

  @override
  String get sendCampaignNow => 'ОТПРАВИТЬ КАМПАНИЮ СЕЙЧАС';

  @override
  String get campaignPerformance => 'ЭФФЕКТИВНОСТЬ КАМПАНИИ';

  @override
  String get reachableGuests => 'ДОСТУПНЫЕ ГОСТИ';

  @override
  String get avgOpenRate => 'СРЕДНИЙ % ОТКРЫТИЙ';

  @override
  String get conversion => 'КОНВЕРСИЯ';

  @override
  String get recentHistory => 'НЕДАВНЯЯ ИСТОРИЯ';

  @override
  String get yourLoyalGuests => 'ВАШИ ЛОЯЛЬНЫЕ ГОСТИ';

  @override
  String get noGuestsFound => 'Гости пока не найдены';

  @override
  String get noGuestsSub =>
      'Гости появятся здесь, когда отсканируют ваш QR-код.';

  @override
  String get guestNameCol => 'ИМЯ ГОСТЯ';

  @override
  String get contactInfoCol => 'КОНТАКТЫ';

  @override
  String get statusCol => 'СТАТУС';

  @override
  String get joinedDateCol => 'ДАТА ПРИСОЕДИНЕНИЯ';

  @override
  String get settingsTitle => 'НАСТРОЙКИ';

  @override
  String get settingsSub =>
      'Управляйте своим аккаунтом и настройками платформы.';

  @override
  String get accountProfile => 'ПРОФИЛЬ АККАУНТА';

  @override
  String get publicProfile => 'Публичный профиль';

  @override
  String get emailAddress => 'Электронная почта';

  @override
  String get connectedVenue => 'Привязанное заведение';

  @override
  String get notifications => 'УВЕДОМЛЕНИЯ';

  @override
  String get pushNotifications => 'Push-уведомления';

  @override
  String get pushNotificationsSub =>
      'Получайте оповещения о визитах в реальном времени.';

  @override
  String get emailReports => 'Email-отчеты';

  @override
  String get emailReportsSub => 'Еженедельные сводки эффективности.';

  @override
  String get connectTelegram => 'Подключить Telegram';

  @override
  String get connectTelegramSub =>
      'Получайте мгновенные уведомления в Telegram боте.';

  @override
  String get localizationLabel => 'ЛОКАЛИЗАЦИЯ';

  @override
  String get languageLabel => 'Язык';

  @override
  String get timezoneLabel => 'Часовой пояс';

  @override
  String get deleteAccount => 'УДАЛИТЬ АККАУНТ';

  @override
  String get venueAnalytics => 'АНАЛИТИКА ЗАВЕДЕНИЯ';

  @override
  String get venueAnalyticsSub =>
      'Подробные показатели эффективности вашей программы лояльности.';

  @override
  String get totalActivations => 'ВСЕГО АКТИВАЦИЙ';

  @override
  String get uniqueGuests => 'УНИКАЛЬНЫХ ГОСТЕЙ';

  @override
  String get retentionRate => 'УДЕРЖАНИЕ (RETENTION)';

  @override
  String get retentionTrend => 'ТРЕНД УДЕРЖАНИЯ';

  @override
  String get retentionTrendSub => 'Среднее время возврата в часах.';

  @override
  String get rewardUsage => 'ИСПОЛЬЗОВАНИЕ НАГРАД';

  @override
  String get rewardUsageSub => 'Какие уровни наиболее популярны?';

  @override
  String get billingTitle => 'БИЛЛИНГ И ПОДПИСКА';

  @override
  String get billingSub => 'Управляйте платежами и деталями тарифа.';

  @override
  String get currentPlan => 'ТЕКУЩИЙ ТАРИФ';

  @override
  String get proPlan => 'ТАРИФ PRO';

  @override
  String nextBillingDate(String date) {
    return 'Следующий счет: $date';
  }

  @override
  String get unlimitedVenues => 'Безлимитные заведения';

  @override
  String get prioritySupport => 'Приоритетная поддержка (SMS/Email)';

  @override
  String get advancedCrm => 'Расширенные CRM-инструменты';

  @override
  String get rawDataExport => 'Экспорт сырых данных';

  @override
  String get paymentMethod => 'СПОСОБ ОПЛАТЫ';

  @override
  String visaEnding(String last4) {
    return 'Visa, заканчивающаяся на $last4';
  }

  @override
  String expires(String date) {
    return 'Истекает $date';
  }

  @override
  String get editBtn => 'ИЗМЕНИТЬ';

  @override
  String get billingHistory => 'ИСТОРИЯ ПЛАТЕЖЕЙ';

  @override
  String get newGuests => 'Новые гости';

  @override
  String get loyalGuests => 'Лояльные гости';

  @override
  String get lostGuests => 'Потерянные гости';

  @override
  String thankYouNextReward(int percent, String time) {
    return '$percent% откроется через: $time';
  }

  @override
  String thankYouValidFor(int percent, String time) {
    return 'Скидка $percent% действует еще: $time';
  }

  @override
  String thankYouMaxReward(String time) {
    return 'Ваша скидка действует еще $time, для максимальной скидки ждем Вас также завтра!';
  }

  @override
  String get thankYouMaxRewardLabel => 'Ваша скидка действует еще';

  @override
  String get thankYouMaxRewardSubtext =>
      'для максимальной скидки ждем Вас также завтра!';

  @override
  String get statusColUpper => 'STATUS';

  @override
  String get subscriptionCol => 'SUBSCRIPTION';

  @override
  String get actionsCol => 'ACTIONS';

  @override
  String get currentlyActive => 'Currently Active';

  @override
  String get statusActive => 'ACTIVE';

  @override
  String get statusFrozen => 'FROZEN';

  @override
  String get planPaid => 'PAID';

  @override
  String get planUnpaid => 'UNPAID';

  @override
  String expiresAt(Object date) {
    return 'Expires: $date';
  }

  @override
  String get switchBtn => 'SWITCH';

  @override
  String switchedTo(Object name) {
    return 'Switched to $name';
  }

  @override
  String get newVenue => 'New Venue';

  @override
  String get editVenue => 'Edit Venue';

  @override
  String get tabVenueSettings => 'Venue Settings';

  @override
  String get tabStaffRbac => 'Staff & RBAC';

  @override
  String get tabDiscountStrategy => 'Discount Strategy';

  @override
  String get sectionBasicInfo => 'Basic Info';

  @override
  String get labelVenueName => 'Venue Name';

  @override
  String get labelCategory => 'Category';

  @override
  String get labelAddress => 'Address';

  @override
  String get sectionOwnership => 'Ownership';

  @override
  String get labelOwnerEmail => 'Owner Email';

  @override
  String get labelOwnerId => 'Owner ID (Firebase UID)';

  @override
  String get sectionMedia => 'Media';

  @override
  String get labelLogoUrl => 'Logo URL';

  @override
  String get labelExternalLink => 'External Link / Website';

  @override
  String get sectionStaffAssignment => 'Staff Assignment';

  @override
  String get labelAssignedAdmin => 'Assigned Admin';

  @override
  String get labelAssignedManager => 'Assigned Manager';

  @override
  String get none => 'None';

  @override
  String get rbacNotice =>
      'Only SuperAdmins and Admins can assign staff roles from this menu.';

  @override
  String get sectionLoyaltyRules => 'Loyalty Rules (Tiers)';

  @override
  String get loyaltyRulesDesc =>
      'Configure the max hours a guest can be gone and the percentage they earn.';

  @override
  String get labelMaxHours => 'Max Hours';

  @override
  String get labelPercentage => 'Percentage (%)';

  @override
  String get sectionSubscriptionStatus => 'Subscription & Status';

  @override
  String get labelPlan => 'Plan:';

  @override
  String get labelPaymentStatus => 'Payment Status:';

  @override
  String get labelExpiryDate => 'Expiry Date:';

  @override
  String get required => 'Обязательно';

  @override
  String get errorLabel => 'Error:';

  @override
  String get notSet => 'Not Set';

  @override
  String get notAvailable => 'N/A';

  @override
  String get navPricing => 'Цены';

  @override
  String get navLogin => 'Войти';

  @override
  String get navGetStarted => 'Начать бесплатно';

  @override
  String get joinPartnerFree => '🤝 Присоединиться бесплатно';

  @override
  String get heroAttractExpensive => 'Привлечь гостя — дорого. Удержать — ';

  @override
  String get heroPriceless => 'бесценно';

  @override
  String get casinoTitle => 'Реклама — это Казино 🎰';

  @override
  String get casinoBody =>
      'Вы платите заранее, надеетесь на клики и молитесь о возврате. Зачем платить за шанс, если можно платить за результат?';

  @override
  String get table4Title => 'Ваша прибыль — за столом №4';

  @override
  String get table4Body =>
      'Удержать старого друга в 7 раз дешевле, чем найти нового. Мы сделаем так, чтобы ваши гости возвращались в два раза чаще.';

  @override
  String get fairGameLabel => 'ЧЕСТНАЯ ИГРА';

  @override
  String get fairGameTitle => 'Платите меньше за постоянных гостей';

  @override
  String get graphToday => 'Сегодня';

  @override
  String get graphTmrw => 'Завтра';

  @override
  String get graph3Days => '3 дня';

  @override
  String get graph7Days => '7 дней';

  @override
  String get fairGameDesc =>
      'Максимальная скидка за быстрый возврат. Низкая скидка для случайных гостей. Вы никогда не теряете маржу зря.';

  @override
  String get noAppDownload => 'Загрузка приложения не требуется';

  @override
  String get noAppDownloadSub =>
      'Гости сканируют QR -> Получают скидку. И всё. Никаких анкет. Никакого трения. 100% конверсия.';

  @override
  String get whatYouGet => 'Что вы получаете';

  @override
  String get featureStatsTitle => 'Подробная статистика посетителей';

  @override
  String get featureStatsBody =>
      'Понимайте своих гостей. Отслеживайте частоту, расходы и уровень удержания в реальном времени.';

  @override
  String get featureCrmTitle => 'Умные коммуникации';

  @override
  String get featureCrmBody =>
      'Мы делим ваших клиентов на Случайных, Постоянных и Лояльных. Автоматически отправляйте целевые предложения.';

  @override
  String get readyToRaise => 'Готовы увеличить прибыль?';

  @override
  String get startFreeTrial => 'Начать бесплатный период';

  @override
  String get footerCopyright =>
      '© 2026 Friendly Code. Сделано с ❤️ для индустрии гостеприимства.';

  @override
  String get flyerTitle => 'Генератор евро-флаера B2B';

  @override
  String get flyerCasinoBody =>
      'Реклама — это казино. Вы платите за шанс. Мы предлагаем платить за результат.';

  @override
  String get flyerDiscountTitle => 'Скидка за возврат';

  @override
  String get flyerYouGet => 'ВЫ ПОЛУЧАЕТЕ:';

  @override
  String get flyerFeatureStats => 'Аналитика гостей в реальном времени';

  @override
  String get flyerFeatureCrm => 'Умная CRM и рассылки';

  @override
  String get flyerFeatureLaunch => 'Запуск за 5 минут';

  @override
  String get flyerTryFree => 'Попробуйте 14 дней бесплатно';

  @override
  String get flyerDownload => 'Скачать PNG для печати';
}
