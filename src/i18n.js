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
            "claim_gift": "CLAIM REWARD"
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
            "claim_gift": "ЗАБРАТЬ ПОДАРОК"
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
