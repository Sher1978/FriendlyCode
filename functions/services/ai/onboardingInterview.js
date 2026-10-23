/**
 * @file onboardingInterview.js
 * AI Onboarding Interview Engine.
 * 
 * Conducts a 3-minute blitz interview with the business owner to train
 * the AI-Concierge without filling boring forms.
 */

const admin = require('firebase-admin');

const INTERVIEW_QUESTIONS = [
  {
    step: 1,
    id: "constraintFactor",
    question: "Привет! Я твой новый цифровой ассистент Revoo. Давай определим базовую модель работы.\n\nЧто является главным ограничивающим ресурсом при обслуживании гостей?\n1. 👤 Личное время мастера (барбер, стилист, мастер массажа)\n2. 🚐 Места в транспорте или группе (рейс, трансфер, тренировка 1:N)\n3. 🏥 Оборудованный кабинет или рабочий бокс (стоматология, клиника, детейлинг)\n4. 🏟 Аренда площадки/зала целиком без персонала (корт, фотостудия, сауна)",
    options: [
      "👤 Время мастера (1:1)",
      "🚐 Места в группе/рейсе (1:N)",
      "🏥 Кабинет / Бокс с оборудованием",
      "🏟 Площадка / Зал целиком"
    ]
  },
  {
    step: 2,
    id: "toneOfVoice",
    question: "Какой у нас тон общения с гостями? Дружеский на «ты» (как в стильном барбершопе) или уважительно-сервисный на «вы» (как в премиум-клинике)?",
    options: ["На «ты» (дружески)", "На «вы» (уважительно-сервисно)"]
  },
  {
    step: 3,
    id: "parkingInstructions",
    question: "Самый частый вопрос гостей до визита — парковка. Где клиентам оставить машину и как проехать (есть ли шлагбаум, код ворот)?",
    placeholder: "Например: Во дворе под шлагбаум, позвонить нам и мы откроем"
  },
  {
    step: 4,
    id: "rulesAndPolicies",
    question: "Есть ли у заведения правила или ограничения? Например: можно ли с домашними животными, детьми, и что делать при опоздании больше 15 минут?",
    placeholder: "Например: С собаками до 5 кг можно. Опоздание более 15 минут — перенос записи"
  },
  {
    step: 5,
    id: "specialFeatures",
    question: "И последнее: чем мы радуем гостей и на каких материалах/косметике работаем? (Чай, кофе с корицей, бренды косметики)",
    placeholder: "Например: Кофе, чай, работаем на премиум косметике Davines"
  }
];

class OnboardingInterviewManager {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Start or get current status of owner onboarding interview.
   */
  async getOrStartInterview(venueId) {
    const venueDoc = await this.db.collection('venues').doc(venueId).get();
    if (!venueDoc.exists) throw new Error(`Venue ${venueId} not found`);

    const venue = venueDoc.data();
    const interviewRef = this.db.collection('venues').doc(venueId).collection('ai_knowledge').doc('interview_session');
    const snap = await interviewRef.get();

    if (!snap.exists) {
      const initialSession = {
        currentStep: 1,
        totalSteps: INTERVIEW_QUESTIONS.length,
        answers: {},
        isCompleted: false,
        venueName: venue.name || 'Заведение',
        venueAddress: venue.address || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await interviewRef.set(initialSession);
      return {
        ...initialSession,
        nextQuestion: INTERVIEW_QUESTIONS[0]
      };
    }

    const session = snap.data();
    const nextQuestion = session.isCompleted ? null : INTERVIEW_QUESTIONS[session.currentStep - 1];

    return {
      ...session,
      nextQuestion
    };
  }

  /**
   * Process owner's answer to the current question and advance step.
   */
  async submitAnswer(venueId, answerText) {
    const interviewRef = this.db.collection('venues').doc(venueId).collection('ai_knowledge').doc('interview_session');
    const snap = await interviewRef.get();
    if (!snap.exists) throw new Error('Interview session not started');

    const session = snap.data();
    if (session.isCompleted) {
      return { isCompleted: true, message: 'Интервью уже завершено.' };
    }

    const currentQ = INTERVIEW_QUESTIONS[session.currentStep - 1];
    const updatedAnswers = {
      ...session.answers,
      [currentQ.id]: answerText.trim()
    };

    const nextStep = session.currentStep + 1;
    const isNowCompleted = nextStep > INTERVIEW_QUESTIONS.length;

    await interviewRef.update({
      answers: updatedAnswers,
      currentStep: nextStep,
      isCompleted: isNowCompleted,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (isNowCompleted) {
      // Synthesize and generate Digital Venue Passport
      await this._finalizeDigitalPassport(venueId, updatedAnswers);
      return {
        isCompleted: true,
        summary: "🎉 Интервью завершено! Цифровой паспорт заведения сформирован. AI-ассистент готов к работе 24/7."
      };
    }

    return {
      isCompleted: false,
      nextQuestion: INTERVIEW_QUESTIONS[nextStep - 1]
    };
  }

  /**
   * Generates and writes Digital Venue Passport in venues/{venueId}/ai_knowledge/profile
   */
  async _finalizeDigitalPassport(venueId, answers) {
    const profileRef = this.db.collection('venues').doc(venueId).collection('ai_knowledge').doc('profile');
    
    const isInformal = (answers.toneOfVoice || '').toLowerCase().includes('ты');

    const profileData = {
      venueId,
      toneOfVoice: isInformal ? 'friendly_informal' : 'respectful_formal',
      parkingInstructions: answers.parkingInstructions || 'Парковка рядом со входом.',
      petPolicy: answers.rulesAndPolicies || 'Уточняйте у администратора.',
      cancellationPolicy: 'Просим предупреждать об отмене минимум за 2 часа.',
      specialInstructions: answers.specialFeatures || 'Предлагать гостям напитки.',
      frequentlyAskedQuestions: [
        {
          q: "Где припарковаться?",
          a: answers.parkingInstructions || "Парковка рядом с заведением."
        },
        {
          q: "Можно ли с домашними животными?",
          a: answers.rulesAndPolicies || "С небольшими питомцами можно."
        },
        {
          q: "Какие напитки и сервис?",
          a: answers.specialFeatures || "Чай, кофе и забота о каждом клиенте."
        }
      ],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await profileRef.set(profileData, { merge: true });
  }
}

module.exports = {
  INTERVIEW_QUESTIONS,
  OnboardingInterviewManager
};
