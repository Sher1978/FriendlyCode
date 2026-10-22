const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');
const { join } = require('path');

const serviceAccountPath = join(__dirname, '..', 'tmp_b2b_keys.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  if (!serviceAccount.project_id) {
    serviceAccount.project_id = 'bot-lab-21910';
  }
} catch (e) {
  console.error('Could not load service account key:', e);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function seed() {
  const venueId = 'test_borderrun_pattaya';
  console.log(`[Admin] Seeding test Border Run venue: ${venueId}...`);

  const venueRef = db.collection('venues').doc(venueId);

  await venueRef.set({
    name: 'Pattaya VIP Border Run',
    category: 'Бордер-ран & Трансферы',
    businessType: 'services',
    currency: '฿',
    phone: '+66 82 123 4567',
    address: 'Central Festival Pattaya Beach, Pattaya City, Thailand',
    description: 'Ежедневные комфортабельные бордер-раны и виза-раны из Паттайи в Камбоджу и Малайзию на новых минивэнах Toyota Commuter VIP. Всё включено: пограничные сборы, вип-коридор без очередей, обед и трансфер.',
    isActive: true,
    isManuallyBlocked: false,
    latitude: 12.9348,
    longitude: 100.8835,
    placeId: 'ChIJX9U_PattayaBorderRun',
    googleMapsUrl: 'https://maps.app.goo.gl/PattayaBorderRunVIP',
    gmConfig: {
      businessType: 'services',
      phone: '+66 82 123 4567',
      primaryColor: '#00FF41'
    },
    subscription: {
      isPaid: true,
      plan: 'pro'
    },
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  }, { merge: true });

  // Services
  const services = [
    {
      id: 'srv_cambodia_basic',
      title: 'Бордер-ран в Камбоджу (Базовый пакет)',
      description: 'Ежедневный выезд в 06:00. Трансфер на минивэне с кондиционером, пограничные сборы, обед, сопровождение и страховка.',
      price: 2900,
      durationMinutes: 600,
      category: 'Камбоджа',
      sortOrder: 1,
      assignedStaffIds: ['master_1', 'master_2'],
      isActive: true
    },
    {
      id: 'srv_cambodia_vip',
      title: 'Бордер-ран в Камбоджу (VIP Всё включено)',
      description: 'Пикап прямо из отеля/кондо, приоритетный вип-коридор без очередей на границе, горячий обед, напитки и новый штамп на 60 дней.',
      price: 3800,
      durationMinutes: 600,
      category: 'Камбоджа VIP',
      sortOrder: 2,
      assignedStaffIds: ['master_1', 'master_2'],
      isActive: true
    },
    {
      id: 'srv_penang_2days',
      title: 'Виза-ран в Пенанг / Малайзия (2 дня / 1 ночь)',
      description: 'Поездка за туристической или студенческой визой. Отель 4*, трансфер, сопровождение в консульстве Таиланда и питание.',
      price: 7500,
      durationMinutes: 1440,
      category: 'Малайзия / Пенанг',
      sortOrder: 3,
      assignedStaffIds: ['master_1'],
      isActive: true
    }
  ];

  for (const s of services) {
    await venueRef.collection('services').doc(s.id).set({
      ...s,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // Staff / Vehicles
  const staff = [
    {
      id: 'master_1',
      name: 'VIP Минивэн Toyota Commuter #1 (Рейс 06:00)',
      role: '10-местный VIP салон, кондиционер, USB-порты и Wi-Fi',
      avatarUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=250&q=80',
      rating: 4.98,
      workStartTime: '06:00',
      workEndTime: '18:00',
      services: ['srv_cambodia_basic', 'srv_cambodia_vip', 'srv_penang_2days'],
      workingHours: {
        monday: { start: '06:00', end: '18:00' },
        tuesday: { start: '06:00', end: '18:00' },
        wednesday: { start: '06:00', end: '18:00' },
        thursday: { start: '06:00', end: '18:00' },
        friday: { start: '06:00', end: '18:00' },
        saturday: { start: '06:00', end: '18:00' },
        sunday: { start: '06:00', end: '18:00' }
      },
      isActive: true
    },
    {
      id: 'master_2',
      name: 'VIP Спринтер #2 (Рейс 07:00)',
      role: 'Кожаные кресла, напитки, индивидуальное прохождение границы',
      avatarUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=250&q=80',
      rating: 4.95,
      workStartTime: '07:00',
      workEndTime: '19:00',
      services: ['srv_cambodia_basic', 'srv_cambodia_vip'],
      workingHours: {
        monday: { start: '07:00', end: '19:00' },
        tuesday: { start: '07:00', end: '19:00' },
        wednesday: { start: '07:00', end: '19:00' },
        thursday: { start: '07:00', end: '19:00' },
        friday: { start: '07:00', end: '19:00' },
        saturday: { start: '07:00', end: '19:00' },
        sunday: { start: '07:00', end: '19:00' }
      },
      isActive: true
    }
  ];

  for (const st of staff) {
    await venueRef.collection('staff').doc(st.id).set({
      ...st,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // Yield Rules
  const yieldRules = [
    {
      id: 'rule_weekday',
      name: 'Скидка на выезд среди недели (Вт-Ср)',
      daysOfWeek: [2, 3],
      startTime: '06:00',
      endTime: '18:00',
      discountType: 'fixed',
      discountValue: 300,
      isActive: true
    },
    {
      id: 'rule_flash',
      name: 'Горящее место за 12 часов до выезда',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      startTime: '06:00',
      endTime: '18:00',
      discountType: 'percentage',
      discountValue: 15,
      isActive: true
    }
  ];

  for (const yr of yieldRules) {
    await venueRef.collection('yield_rules').doc(yr.id).set({
      ...yr,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // AI Knowledge Profile
  await venueRef.collection('ai_knowledge').doc('profile').set({
    toneOfVoice: 'respectful_formal',
    mainServices: 'Бордер-раны в Камбоджу (Базовый и VIP), виза-раны в Малайзию на Пенанг, трансферы на границу',
    parkingInstructions: 'Бесплатный трансфер забирает пассажиров от отелей и кондоминиумов в центральных районах Паттайи с 05:15 до 05:45, а также от главного входа Central Festival.',
    petPolicy: 'Для поездки обязателен оригинал загранпаспорта (срок от 6 месяцев), минимум 2 чистые страницы и 2 цветных фото 3x4 см. При оверстее до 7 дней оплачивается штраф 500 бат/день на границе.',
    specialInstructions: 'Все микроавтобусы оборудованы раздельным климат-контролем, USB-портами для зарядки телефонов и питьевой водой. Обед включен в стоимость.',
    cancellationPolicy: 'Бесплатная отмена или перенос поездки за 12 часов до времени сбора.',
    faq: [
      {
        q: 'Какие документы нужны для поездки?',
        a: 'Оригинал загранпаспорта сроком действия не менее 6 месяцев, минимум 2 чистые страницы для штампов и 2 цветных фото 3x4 см.'
      },
      {
        q: 'Откуда отправляется минивэн?',
        a: 'Бесплатный трансфер забирает пассажиров прямо от кондоминиумов и отелей в центральных районах Паттайи, а также от Central Festival.'
      },
      {
        q: 'Что входит в стоимость?',
        a: 'Трансфер на VIP минивэне туда и обратно, все пограничные и визовые сборы, сопровождение, проход без очередей и горячий обед.'
      },
      {
        q: 'Можно ли поехать с оверстеем?',
        a: 'Да, с оверстеем до 7 дней выезд возможен. Официальный штраф иммиграционной службы составляет 500 бат в день и оплачивается на границе.'
      }
    ],
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  console.log("SUCCESS: Venue 'test_borderrun_pattaya' seeded in Firestore!");
}

seed().then(() => process.exit(0)).catch(e => {
  console.error("Seed error:", e);
  process.exit(1);
});
