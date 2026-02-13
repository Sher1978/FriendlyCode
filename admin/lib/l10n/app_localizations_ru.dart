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
  String get expired => 'Истекло (5%)';

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
  String get guestDatabase => 'База гостей';

  @override
  String get guestDatabaseSub => 'Ваши лояльные клиенты';

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
}
