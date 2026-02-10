import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "app_name": "Friendly Code",
            "get_status": "GET STATUS",
            "welcome": "Welcome!",
            "enable_rewards": "Let's enable your Guest Rewards. 👋",
            "your_name": "Your Name",
            "enter_manually": "OR ENTER MANUALLY",
            "connect_messenger": "CONNECT VIA MESSENGER",
            "continue_guest": "CONTINUE AS GUEST",
            "success_unlocked": "YAY! REWARD UNLOCKED! 🎉",
            "off_bill": "OFF TOTAL BILL",
            "enjoy_meal": "Enjoy your meal, {{name}}! 🍽️",
            "show_waiter": "Show this to your waiter to claim your perk! ✨",
            "expires_in": "Expires in 24h",
            "no_downloads": "No Downloads. No App Store.",
            "dont_be_customer": "Don't just be a customer.",
            "be_a_guest": "Be a Guest.",
            "headline_1": "FRIENDLY\nCODE",
            "returning_title": "Welcome Back!",
            "returning_thanks": "Thanks for visiting us again.",
            "returning_discount": "Your discount today is",
            "claim_gift": "CLAIM REWARD",
            "hero_title": "Gifts you don't need to download anything for.",
            "hero_sub": "Friendly Code is a club of friends. Get compliments in your favorite places just for walking in.",
            "cta_map": "Find Gifts Nearby",
            "anti_boring_title": "Stop saving points for 2030!",
            "anti_boring_desc": "Saving bonuses for years is outdated and boring. We value your time and desire for instant gratification.",
            "golden_rule": "Just come back tomorrow — and get the max discount!",
            "today": "Today",
            "tomorrow": "Tomorrow",
            "always": "Always",
            "your_discount_today": "Your Discount TODAY: 5%",
            "want_max_discount": "Want 20%? Come back tomorrow!",
            "today_val": "Today: 5%",
            "tomorrow_val": "Tomorrow: 20%",
            "in_3_days": "In 3 Days: 15%",
            "in_7_days": "In 7 Days: 10%",
            "footer_motivation": "The sooner you return, the bigger the discount.",
            "get_my_discount": "GET MY DISCOUNT",
            "hero_cta_demo": "🎁 Get Gift (Demo)",
            "anti_boring_headline": "Stop saving points for 2030!",
            "anti_boring_sub": "Saving bonuses for years is outdated and boring. We value your time and desire for instant gratification.",
            "step_1_title": "Today",
            "step_1_desc": "First time here? Get a nice Welcome compliment. Just for saying hi.",
            "step_2_title": "Tomorrow",
            "step_2_desc": "Came back? Your privilege instantly grows! You are already Super VIP and get the max.",
            "step_3_title": "Always",
            "step_3_desc": "Keep your status by visiting. Visit more often — more magic. Missed a week? No worries, just come back to be Super VIP again.",
            "path_headline": "Becoming a Super VIP friend is easier than easy.",
            "path_scan_title": "Scan",
            "path_scan_desc": "Saw a QR on the table? Just point your camera.",
            "path_grow_title": "Grow",
            "path_grow_desc": "Every scan is a step towards Super VIP status. The system remembers everything.",
            "path_enjoy_title": "Enjoy",
            "path_enjoy_desc": "Show your screen to the waiter and get perks. Your loyalty is your main bonus."
        }
    },
    ru: {
        translation: {
            "app_name": "Friendly Code",
            "get_status": "ПОЛУЧИТЬ СТАТУС",
            "welcome": "Добро пожаловать!",
            "enable_rewards": "Давайте активируем ваши привилегии. 👋",
            "your_name": "Ваше имя",
            "enter_manually": "ИЛИ ВВЕДИТЕ ВРУЧНУЮ",
            "connect_messenger": "ПОДКЛЮЧИТЬ МЕССЕНДЖЕР",
            "continue_guest": "ПРОДОЛЖИТЬ КАК ГОСТЬ",
            "success_unlocked": "УРА! ТВОЯ НАГРАДА! 🎉",
            "off_bill": "СКИДКА НА ВЕСЬ ЧЕК",
            "enjoy_meal": "Приятного аппетита, {{name}}! 🍽️",
            "show_waiter": "Покажите это официанту, чтобы получить бонус! ✨",
            "expires_in": "Действует 24ч",
            "no_downloads": "Без скачиваний. Без App Store.",
            "dont_be_customer": "Не будь просто клиентом.",
            "be_a_guest": "Будь Гостем.",
            "headline_1": "FRIENDLY\nCODE",
            "returning_title": "С возвращением!",
            "returning_thanks": "Спасибо, что зашли к нам снова.",
            "returning_discount": "Ваша скидка сегодня",
            "claim_gift": "ЗАБРАТЬ ПОДАРОК",
            "hero_title": "Подарки, ради которых НЕ НУЖНО ничего скачивать.",
            "hero_sub": "Friendly Code — это клуб друзей. Получай комплименты в любимых местах города просто за то, что ты зашел. Забудь про анкеты, пластик и спам. Твой любимый город теперь знает тебя в лицо.",
            "cta_map": "Найти подарки рядом",
            "anti_boring_title": "Хватит копить баллы к 2030 году!",
            "anti_boring_desc": "Копить бонусы годами — это жутко устарело и скучно. Мы ценим твое время и твоё желание получать выгоду здесь и сейчас.",
            "golden_rule": "Просто приди завтра — и получи максимальную скидку!",
            "today": "Сегодня",
            "tomorrow": "Завтра",
            "always": "Всегда",
            "your_discount_today": "Ваша скидка СЕГОДНЯ: 5%",
            "want_max_discount": "Хотите 20%? Приходите завтра!",
            "today_val": "Сегодня: 5%",
            "tomorrow_val": "Завтра: 20%",
            "in_3_days": "Через 3 дня: 15%",
            "in_7_days": "Через 7 дней: 10%",
            "footer_motivation": "Чем раньше вернетесь, тем больше скидка.",
            "get_my_discount": "ПОЛУЧИТЬ СКИДКУ",
            "hero_cta_demo": "🎁 Получить подарок (Демо)",
            "anti_boring_headline": "Хватит копить баллы к 2030 году!",
            "anti_boring_sub": "Копить бонусы годами — это жутко устарело и скучно. Мы ценим твое время и твоё желание получать выгоду здесь и сейчас.",
            "step_1_title": "Сегодня",
            "step_1_desc": "Зашел впервые? Получи приятный Welcome-комплимент. Просто за знакомство.",
            "step_2_title": "Завтра",
            "step_2_desc": "Ты вернулся? Твоя привилегия мгновенно вырастает! Ты уже Super VIP и получаешь максимум, потому что мы ценим твою преданность.",
            "step_3_title": "Всегда",
            "step_3_desc": "Сохраняй статус, заходя в гости. Чаще ходишь — больше магии. Пропустил неделю? Не страшно, просто возвращайся, чтобы снова стать Super VIP.",
            "path_headline": "Стать Super VIP другом — это проще простого.",
            "path_scan_title": "Сканируй",
            "path_scan_desc": "Увидел QR на столе? Просто наведи камеру.",
            "path_grow_title": "Расти",
            "path_grow_desc": "Каждое сканирование — это шаг к статусу Super VIP. Система всё помнит.",
            "path_enjoy_title": "Наслаждайся",
            "path_enjoy_desc": "Показывай экран официанту и получай привилегии. Твоя лояльность — твой главный бонус."



        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
