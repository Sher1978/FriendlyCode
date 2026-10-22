import { db, auth } from '../src/firebase.js';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';

async function seedBorderRunVenue() {
  const venueId = 'test_borderrun_pattaya';
  console.log(`Authenticating and seeding test Border Run venue: ${venueId}...`);

  const userCred = await signInAnonymously(auth);
  const ownerUid = userCred.user.uid;
  console.log(`Authenticated as anonymous user: ${ownerUid}`);

  const venueRef = doc(db, 'venues', venueId);

  // 1. Venue Main Document
  await setDoc(venueRef, {
    name: 'Pattaya VIP Border Run',
    category: 'Бордер-ран & Трансферы',
    businessType: 'services',
    ownerId: ownerUid,
    currency: '฿',
    phone: '+66 82 123 4567',
    address: 'Central Festival Pattaya Beach, 333/99 Moo 9, Pattaya City, Thailand',
    description: 'Ежедневные комфортабельные бордер-раны и виза-раны из Паттайи в Камбоджу и Малайзию на новых минивэнах Toyota Commuter VIP. Пограничные сборы, вип-коридор без очередей, обед и трансфер включены.',
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
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  }, { merge: true });

  // 2. Services
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
    const sRef = doc(collection(db, 'venues', venueId, 'services'), s.id);
    await setDoc(sRef, {
      ...s,
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  // 3. Staff / Vehicles
  const staffMembers = [
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

  for (const st of staffMembers) {
    const stRef = doc(collection(db, 'venues', venueId, 'staff'), st.id);
    await setDoc(stRef, {
      ...st,
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  // 4. Yield Rules
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
    const yrRef = doc(collection(db, 'venues', venueId, 'yield_rules'), yr.id);
    await setDoc(yrRef, {
      ...yr,
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  // 5. AI Knowledge Profile
  const aiRef = doc(collection(db, 'venues', venueId, 'ai_knowledge'), 'profile');
  await setDoc(aiRef, {
    toneOfVoice: 'respectful_formal',
    mainServices: 'Бордер-раны в Камбоджу (Базовый и VIP), виза-раны в Малайзию на Пенанг, трансферы на границу',
    parkingInstructions: 'Бесплатный трансфер забирает пассажиров от отелей и кондоминиумов в центральных районах Паттайи с 05:15 до 05:45, а также от главного входа Central Festival.',
    petPolicy: 'Для поездки обязателен оригинал загранпаспорта (срок от 6 месяцев), минимум 2 чистые страницы и 2 цветных фото 3x4 см. При оверстее до 7 дней оплачивается штраф 500 бат/день на границе.',
    specialInstructions: 'Все микроавтобусы оборудованы раздельным климат-контролем, USB-портами для зарядки телефонов и питьевой водой. Обед включен в стоимость.',
    cancellationPolicy: 'Бесплатная отмена или перенос поездки за 12 часов до времени сбора.',
    faq: [
      {
        q: 'Какие документы нужны для поездки?',
        a: 'Оригинал загранпаспорта сроком действия от 6 месяцев, минимум 2 чистые страницы для штампов и 2 цветных фото 3x4 см.'
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
    updatedAt: serverTimestamp()
  }, { merge: true });

  console.log("Successfully seeded test Border Run venue 'test_borderrun_pattaya'!");
}

seedBorderRunVenue().then(() => process.exit(0)).catch(err => {
  console.error("Error seeding venue:", err);
  process.exit(1);
});
