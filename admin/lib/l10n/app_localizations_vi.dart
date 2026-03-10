// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Vietnamese (`vi`).
class AppLocalizationsVi extends AppLocalizations {
  AppLocalizationsVi([String locale = 'vi']) : super(locale);

  @override
  String get appName => 'Friendly Code';

  @override
  String get loginTitle => 'Chào mừng quay lại';

  @override
  String get loginSubtitle => 'Đăng nhập để quản lý địa điểm và xem báo cáo.';

  @override
  String get googleSignIn => 'Đăng nhập bằng Google';

  @override
  String get ownerDashboard => 'Bảng điều khiển Chủ sở hữu';

  @override
  String get adminDashboard => 'Bảng điều khiển Admin';

  @override
  String get settings => 'Cài đặt';

  @override
  String get language => 'Ngôn ngữ';

  @override
  String get logout => 'Đăng xuất';

  @override
  String get metrics => 'CHỈ SỐ HÔM NAY';

  @override
  String get totalCheckins => 'Tổng lượt check-in';

  @override
  String get avgReturn => 'Tỷ lệ quay lại TB';

  @override
  String get discountDist => 'PHÂN BỔ GIẢM GIÁ';

  @override
  String get tier1 => 'Hạng 1 (20%)';

  @override
  String get tier2 => 'Hạng 2 (15%)';

  @override
  String get tier3 => 'Hạng 3 (10%)';

  @override
  String get expired => 'HẾT HẠN';

  @override
  String get management => 'QUẢN LÝ';

  @override
  String get venueProfile => 'Hồ sơ Địa điểm';

  @override
  String get venueProfileSub => 'Tên, Giờ mở cửa, Ảnh';

  @override
  String get configRules => 'Cấu hình Quy tắc thời gian';

  @override
  String get configRulesSub => 'Điều chỉnh giới hạn giảm dần và tỷ lệ';

  @override
  String get marketingBlast => 'Gửi thông báo Marketing';

  @override
  String get marketingBlastSub => 'Kết nối lại với khách hàng đã mất';

  @override
  String get adminConsole => 'BẢNG ĐIỀU KHIỂN TỔNG';

  @override
  String get platformOverview => 'Tổng quan Nền tảng';

  @override
  String get totalVenues => 'Tổng số Địa điểm';

  @override
  String get totalGuests => 'Tổng số Khách';

  @override
  String get pendingApproval => 'Chờ phê duyệt';

  @override
  String get activeVenues => 'Địa điểm đang hoạt động';

  @override
  String get manage => 'QUẢN LÝ';

  @override
  String get venues => 'Địa điểm';

  @override
  String get users => 'Người dùng';

  @override
  String get systemStats => 'Thống kê Hệ thống';

  @override
  String get rewardLogicConfig => 'Cấu hình Logic Thưởng';

  @override
  String get configTierLimit => 'Cấu hình tối đa 5 hạng thời gian.';

  @override
  String get addTier => 'Thêm hạng';

  @override
  String get retentionBase => 'Mức giữ chân (Hết hạn)';

  @override
  String get rewardPercent => 'Tỷ lệ thưởng %';

  @override
  String get tierHint =>
      'Áp dụng khi khách quay lại SAU thời hạn của hạng cuối cùng.';

  @override
  String get saveLogic => 'LƯU LOGIC';

  @override
  String get logicUpdated => 'Đã cập nhật Logic Thưởng!';

  @override
  String get visitWithinHrs => 'Ghé thăm trong (Giờ)';

  @override
  String tierLabel(int index) {
    return 'Hạng $index';
  }

  @override
  String get marketingTitle => 'Thông báo Marketing';

  @override
  String get marketingDesc =>
      'Gửi thông báo nhắc nhở tới những khách đã lâu chưa quay lại.';

  @override
  String get sendBlast => 'GỬI THÔNG BÁO';

  @override
  String get blastSuccess => 'Đã gửi thông báo Marketing!';

  @override
  String get editVenueProfile => 'Chỉnh sửa Hồ sơ Địa điểm';

  @override
  String get venueEditor => 'Biên tập Địa điểm';

  @override
  String get guestPortalLanguage => 'Ngôn ngữ Cổng thông tin Khách';

  @override
  String get guestPortalLanguageDescription =>
      'Chọn ngôn ngữ mặc định mà khách sẽ thấy khi họ quét mã QR của bạn.';

  @override
  String get venueName => 'Tên Địa điểm';

  @override
  String get description => 'Mô tả';

  @override
  String get workingHours => 'Giờ làm việc';

  @override
  String get instagram => 'Instagram';

  @override
  String get saveChanges => 'LƯU THAY ĐỔI';

  @override
  String get profileUpdated => 'Cập nhật Hồ sơ thành công';

  @override
  String get tapToChangeCover => 'Chạm để thay đổi Ảnh bìa';

  @override
  String get uploadPhoto => 'Trình tải ảnh';

  @override
  String get posStickerGenerator => 'Tạo nhãn POS';

  @override
  String get posStickerSub => 'In nhãn dán cho bàn';

  @override
  String get guestDatabase => 'Cơ sở dữ liệu Khách';

  @override
  String get guestDatabaseSub => 'Xem danh sách khách hàng thân thiết';

  @override
  String get staffManagement => 'Quản lý Nhân sự';

  @override
  String get staffManagementSub => 'Quản lý nhân viên của bạn';

  @override
  String get downloadHighRes => 'TẢI ẢNH ĐỘ PHÂN GIẢI CAO';

  @override
  String get stickerInstantDiscount => 'Giảm giá tức thì.';

  @override
  String get stickerNoApps => 'Không app, không đăng ký.';

  @override
  String stickerToday(int percent) {
    return 'Hôm nay: $percent%';
  }

  @override
  String stickerTomorrow(int percent) {
    return 'Ngày mai: $percent%';
  }

  @override
  String get shareToClients => 'CHIA SẺ VỚI KHÁCH';

  @override
  String get downloadQr => 'TẢI MÃ QR';

  @override
  String get myDashboard => 'BẢNG ĐIỀU KHIỂN CỦA TÔI';

  @override
  String switchVenue(int count) {
    return 'CHUYỂN ĐỊA ĐIỂM ($count)';
  }

  @override
  String welcomeBackHeadline(int percent) {
    return 'Chào mừng trở lại! 🌟 \nƯu đãi HÔM NAY: $percent%';
  }

  @override
  String get welcomeBackSubhead => 'Bạn quay lại càng sớm, ưu đãi càng lớn.';

  @override
  String rewardTodayHeadline(int percent) {
    return 'Ưu đãi của bạn \nHÔM NAY: $percent%';
  }

  @override
  String get rewardTodaySubhead => 'Muốn 20%? Hãy quay lại vào ngày mai!';

  @override
  String get getReward => 'NHẬN ƯU ĐÃI';

  @override
  String get venueNotFound => 'Không tìm thấy địa điểm';

  @override
  String get venueNotFoundSub =>
      'Liên kết có vẻ bị hỏng hoặc địa điểm không còn hoạt động.';

  @override
  String get goToHome => 'VỀ TRANG CHỦ';

  @override
  String get b2bHeroH1 =>
      'Thu hút khách mới — tốn kém. Giữ chân khách cũ — vô giá.';

  @override
  String get b2bHeroSub =>
      'Hệ thống khách hàng thân thiết \"thông minh\" duy nhất giúp tăng lợi nhuận thêm 25%. Biến khách vãng lai thành VIP chỉ sau 24 giờ. Không cần app. Không thẻ nhựa. Không tốn sức.';

  @override
  String get b2bHeadline => 'Khách hàng thân thiết không rào cản';

  @override
  String get getTheApp => 'Tải ứng dụng Friendly Code';

  @override
  String get downloadOn => 'Tải trên';

  @override
  String get accessDeniedAdmin =>
      'Truy cập bị từ chối: Bạn không có quyền Admin.';

  @override
  String loginFailed(String error) {
    return 'Đăng nhập thất bại: $error';
  }

  @override
  String timelineItem(String time, int percent) {
    return '$time: $percent%';
  }

  @override
  String get timelineToday => 'Hôm nay';

  @override
  String get timelineTomorrow => 'Ngày mai';

  @override
  String timelineInDays(int count) {
    return 'Sau $count ngày';
  }

  @override
  String get almostThere => 'Sắp xong rồi!';

  @override
  String get introduceYourself =>
      'Vui lòng giới thiệu bản thân để nhận ưu đãi.';

  @override
  String get yourName => 'TÊN CỦA BẠN';

  @override
  String get nameHint => 'vd: Alex';

  @override
  String get yourEmail => 'EMAIL CỦA BẠN';

  @override
  String get emailHint => 'name@example.com';

  @override
  String thanksForVisiting(String name) {
    return 'Cảm ơn bạn đã ghé thăm, \n$name!';
  }

  @override
  String get specialTreat => 'Đây là món quà đặc biệt dành cho bạn.';

  @override
  String get currentDiscount => 'ƯU ĐÃI HIỆN TẠI';

  @override
  String get offTotalBill => 'GIẢM TỔNG HÓA ĐƠN';

  @override
  String get getMyGift => 'NHẬN QUÀ';

  @override
  String get showStaff =>
      'Hiển thị màn hình này cho nhân viên \nkhi thanh toán để nhận ưu đãi.';

  @override
  String get tapWhenReady =>
      'Chạm vào nút phía trên khi \nbạn đã sẵn sàng thanh toán.';

  @override
  String get marketingAudience => 'Chọn Đối tượng';

  @override
  String get marketingAudienceSub =>
      'Chọn những người sẽ nhận tin nhắn của bạn.';

  @override
  String get marketingMessage => 'Nội dung Tin nhắn';

  @override
  String get marketingMessageSub =>
      'Viết một lý do thuyết phục để họ quay lại.';

  @override
  String get campaignTitle => 'Tiêu đề Chiến dịch';

  @override
  String get campaignTitleHint => 'Brunch cuối tuần giảm 20%!';

  @override
  String get messageBody => 'Nội dung Tin nhắn';

  @override
  String get messageBodyHint =>
      'Này! Chúng tôi nhớ bạn. Hãy đưa tin nhắn này để nhận cafe miễn phí cho bữa ăn tiếp theo nhé! ☕';

  @override
  String get campaignImage => 'ẢNH CHIẾN DỊCH (TÙY CHỌN)';

  @override
  String get actionLink => 'Liên kết hành động (Tùy chọn)';

  @override
  String get actionLinkHint => 'https://menu.link/specials';

  @override
  String get frequencyWarning =>
      'Chiến dịch giới hạn 1 lần mỗi tuần để đảm bảo hiệu quả gửi tin tốt nhất.';

  @override
  String get preparing => 'ĐANG CHUẨN BỊ...';

  @override
  String get sendCampaignNow => 'GỬI CHIẾN DỊCH NGAY';

  @override
  String get campaignPerformance => 'HIỆU QUẢ CHIẾN DỊCH';

  @override
  String get reachableGuests => 'KHÁCH CÓ THỂ TIẾP CẬN';

  @override
  String get avgOpenRate => 'TỶ LỆ MỞ TB';

  @override
  String get conversion => 'CHUYỂN ĐỔI';

  @override
  String get recentHistory => 'LỊCH SỬ GẦN ĐÂY';

  @override
  String get yourLoyalGuests => 'KHÁCH HÀNG THÂN THIẾT';

  @override
  String get noGuestsFound => 'Chưa tìm thấy khách hàng nào';

  @override
  String get noGuestsSub =>
      'Khách hàng sẽ xuất hiện ở đây sau khi họ quét mã QR.';

  @override
  String get guestNameCol => 'TÊN KHÁCH';

  @override
  String get contactInfoCol => 'LIÊN HỆ';

  @override
  String get statusCol => 'TRẠNG THÁI';

  @override
  String get joinedDateCol => 'NGÀY THAM GIA';

  @override
  String get settingsTitle => 'CÀI ĐẶT';

  @override
  String get settingsSub => 'Quản lý tài khoản và sở thích nền tảng.';

  @override
  String get accountProfile => 'HỒ SƠ TÀI KHOẢN';

  @override
  String get publicProfile => 'Hồ sơ Công khai';

  @override
  String get emailAddress => 'Địa chỉ Email';

  @override
  String get connectedVenue => 'Địa điểm đã kết nối';

  @override
  String get notifications => 'THÔNG BÁO';

  @override
  String get pushNotifications => 'Thông báo Push';

  @override
  String get pushNotificationsSub =>
      'Nhận cảnh báo khách ghé thăm theo thời gian thực.';

  @override
  String get emailReports => 'Báo cáo qua Email';

  @override
  String get emailReportsSub => 'Bản tóm tắt hiệu quả hàng tuần.';

  @override
  String get connectTelegram => 'Kết nối Telegram';

  @override
  String get connectTelegramSub => 'Nhận cảnh báo tức thì qua Telegram bot.';

  @override
  String get localizationLabel => 'BẢN ĐỊA HÓA';

  @override
  String get languageLabel => 'Ngôn ngữ';

  @override
  String get timezoneLabel => 'Múi giờ';

  @override
  String get deleteAccount => 'XÓA TÀI KHOẢN';

  @override
  String get venueAnalytics => 'PHÂN TÍCH ĐỊA ĐIỂM';

  @override
  String get venueAnalyticsSub =>
      'Hiệu quả chi tiết của chương trình khách hàng thân thiết.';

  @override
  String get totalActivations => 'TỔNG LƯỢT KÍCH HOẠT';

  @override
  String get uniqueGuests => 'KHÁCH DUY NHẤT';

  @override
  String get retentionRate => 'TỶ LỆ GIỮ CHÂN';

  @override
  String get retentionTrend => 'XU HƯỚNG GIỮ CHÂN';

  @override
  String get retentionTrendSub =>
      'Thời gian quay lại trung bình tính bằng giờ.';

  @override
  String get rewardUsage => 'SỬ DỤNG ƯU ĐÃI';

  @override
  String get rewardUsageSub => 'Hạng nào được ưa chuộng nhất?';

  @override
  String get billingTitle => 'THANH TOÁN & GÓI CƯỚC';

  @override
  String get billingSub => 'Quản lý thanh toán và thông tin gói cước.';

  @override
  String get currentPlan => 'GÓI HIỆN TẠI';

  @override
  String get proPlan => 'GÓI PRO';

  @override
  String nextBillingDate(String date) {
    return 'Ngày thanh toán tiếp theo: $date';
  }

  @override
  String get unlimitedVenues => 'Không giới hạn Địa điểm';

  @override
  String get prioritySupport => 'Hỗ trợ Ưu tiên SMS/Email';

  @override
  String get advancedCrm => 'Công cụ CRM nâng cao';

  @override
  String get rawDataExport => 'Xuất dữ liệu thô';

  @override
  String get paymentMethod => 'PHƯƠNG THỨC THANH TOÁN';

  @override
  String visaEnding(String last4) {
    return 'Visa kết thúc bằng $last4';
  }

  @override
  String expires(String date) {
    return 'Hết hạn $date';
  }

  @override
  String get editBtn => 'SỬA';

  @override
  String get billingHistory => 'LỊCH SỬ THANH TOÁN';

  @override
  String get newGuests => 'Khách mới';

  @override
  String get loyalGuests => 'Khách quen';

  @override
  String get lostGuests => 'Khách đã mất';

  @override
  String thankYouNextReward(int percent, String time) {
    return '$percent% sẽ mở khóa sau: $time';
  }

  @override
  String thankYouValidFor(int percent, String time) {
    return 'Ưu đãi $percent% hiệu lực trong: $time';
  }

  @override
  String thankYouMaxReward(String time) {
    return 'Ưu đãi của bạn có hiệu lực trong $time. Để duy trì ưu đãi tối đa, hãy ghé thăm chúng tôi vào ngày mai nữa!';
  }

  @override
  String get thankYouMaxRewardLabel => 'Ưu đãi của bạn có hiệu lực trong';

  @override
  String get thankYouMaxRewardSubtext =>
      'Để duy trì ưu đãi tối đa, hãy ghé thăm chúng tôi vào ngày mai nữa!';

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
  String get navPricing => 'Bảng giá';

  @override
  String get navLogin => 'Đăng nhập';

  @override
  String get navGetStarted => 'Bắt đầu miễn phí';

  @override
  String get joinPartnerFree => '🤝 Tham gia Friendly Code miễn phí';

  @override
  String get heroAttractExpensive => 'Thu hút khách mới — tốn kém. Giữ chân — ';

  @override
  String get heroPriceless => 'vô giá';

  @override
  String get casinoTitle => 'Quảng cáo là một sòng bạc 🎰';

  @override
  String get casinoBody =>
      'Bạn trả tiền trước, hy vọng vào các lượt nhấp và cầu nguyện họ quay lại. Tại sao phải trả tiền cho một cơ hội khi bạn có thể trả tiền cho kết quả?';

  @override
  String get table4Title => 'Lợi nhuận của bạn nằm ở bàn số 4';

  @override
  String get table4Body =>
      'Giữ một người bạn cũ rẻ hơn 7 lần so với việc tìm một người mới. Chúng tôi đảm bảo khách hàng hiện tại của bạn quay lại thường xuyên gấp đôi.';

  @override
  String get fairGameLabel => 'TRÒ CHƠI CÔNG BẰNG';

  @override
  String get fairGameTitle => 'Chi trả ít hơn cho khách quen';

  @override
  String get graphToday => 'Hôm nay';

  @override
  String get graphTmrw => 'Ngày mai';

  @override
  String get graph3Days => '3 ngày';

  @override
  String get graph7Days => '7 ngày';

  @override
  String get fairGameDesc =>
      'Giảm giá tối đa khi quay lại sớm. Giảm giá thấp cho khách vãng lai. Bạn không bao giờ mất biên lợi nhuận một cách vô ích.';

  @override
  String get noAppDownload => 'Không cần tải xuống ứng dụng';

  @override
  String get noAppDownloadSub =>
      'Khách quét QR -> Nhận ưu đãi. Chỉ vậy thôi. Không form đăng ký. Không rào cản. Chuyển đổi 100%.';

  @override
  String get whatYouGet => 'Những gì bạn nhận được';

  @override
  String get featureStatsTitle => 'Thống kê người truy cập chi tiết';

  @override
  String get featureStatsBody =>
      'Hiểu khách hàng của bạn. Theo dõi tần suất, chi tiêu và tỷ lệ giữ chân trong thời gian thực.';

  @override
  String get featureCrmTitle => 'Giao tiếp thông minh';

  @override
  String get featureCrmBody =>
      'Chúng tôi chia khách hàng của bạn thành Ngẫu nhiên, Thường xuyên và Thân thiết. Tự động gửi các đề nghị giữ chân mục tiêu.';

  @override
  String get readyToRaise => 'Sẵn sàng tăng lợi nhuận?';

  @override
  String get startFreeTrial => 'Bắt đầu dùng thử miễn phí';

  @override
  String get footerCopyright =>
      '© 2026 Friendly Code. Được xây dựng với ❤️ dành cho ngành Dịch vụ.';

  @override
  String get flyerTitle => 'Tạo Flyer Euro B2B';

  @override
  String get flyerCasinoBody =>
      'Quảng cáo là một sòng bạc. Bạn trả tiền cho một cơ hội. Chúng tôi giúp bạn trả tiền cho kết quả.';

  @override
  String get flyerDiscountTitle => 'Giảm giá khi quay lại';

  @override
  String get flyerYouGet => 'BẠN NHẬN ĐƯỢC:';

  @override
  String get flyerFeatureStats => 'Phân tích khách hàng thời gian thực';

  @override
  String get flyerFeatureCrm => 'CRM & Giao tiếp thông minh';

  @override
  String get flyerFeatureLaunch => 'Khởi động trong 5 phút';

  @override
  String get flyerTryFree => 'Dùng thử 14 ngày miễn phí';

  @override
  String get flyerDownload => 'Tải PNG sẵn dàng in';
}
