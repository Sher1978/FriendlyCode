import { db } from '../src/firebase.js';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

async function setupDeliveryData() {
  console.log("Setting up delivery menu & loyalty for venue 'deCg3Rq1oTawHoOImnoj'...");
  const venueRef = doc(db, 'venues', 'deCg3Rq1oTawHoOImnoj');
  const snap = await getDoc(venueRef);

  if (!snap.exists()) {
    console.log("Venue not found, creating test venue...");
  } else {
    console.log("Found venue:", snap.data().name);
  }

  const sampleMenuItems = [
    {
      id: "pho_bo_dac_biet",
      name: "Фо Бо Особенный (Phở Bò Đặc Biệt)",
      category: "Супы & Лапша",
      description: "Насыщенный говяжий бульон 12-часовой варки, мраморная говядина, рисовая лапша и свежая зелень",
      price: "120000",
      aggregatorPrice: "155000",
      currency: "VND",
      imageUrl: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60",
      isPublished: true,
      isAvailable: true
    },
    {
      id: "nem_ran_hai_san",
      name: "Немы с морепродуктами (Nem Rán)",
      category: "Закуски",
      description: "Хрустящие спринг-роллы с начинкой из креветок, кальмара, моркови и древесных грибов",
      price: "85000",
      aggregatorPrice: "110000",
      currency: "VND",
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60",
      isPublished: true,
      isAvailable: true
    },
    {
      id: "ca_phe_trung",
      name: "Вьетнамский яичный кофе (Cà Phê Trứng)",
      category: "Напитки",
      description: "Традиционный крепкий кофе робуста с густой взбитой яично-карамельной пенкой",
      price: "50000",
      aggregatorPrice: "65000",
      currency: "VND",
      imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60",
      isPublished: true,
      isAvailable: true
    }
  ];

  const deliveryLoyaltyConfig = {
    useCustomDeliveryTiers: true,
    percBase: 10,
    percMedium: 15,
    percVip: 20,
    percDeposit: 25,
    vipWindowDays: 2,
    mediumDays: 7,
    freeDeliveryThreshold: 200000,
    pickupBonusDiscount: 5,
    happyHours: [
      {
        name: "Обеденный Раш",
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        startHour: "00:00",
        endHour: "23:59",
        discountBonus: 5,
        isActive: true
      }
    ]
  };

  const paymentConfig = {
    enableVietQr: true,
    bankBin: "970422", // MB Bank
    accountNumber: "0901234567",
    accountName: "SVOI RESTAURANT",
    enableCashOnDelivery: true
  };

  await setDoc(venueRef, {
    gmConfig: {
      businessType: 'horeca',
      menuItems: sampleMenuItems,
      usePdfMenu: false
    },
    deliveryLoyaltyConfig,
    paymentConfig
  }, { merge: true });

  console.log("✅ Successfully updated venue deCg3Rq1oTawHoOImnoj with delivery items and loyalty config!");
  process.exit(0);
}

setupDeliveryData().catch(e => {
  console.error("Setup error:", e);
  process.exit(1);
});
