import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create Default Admin User
  const adminId = 123456789n;
  await prisma.telUser.upsert({
    where: { id: adminId },
    update: {},
    create: {
      id: adminId,
      username: "admin",
      language: "ru",
      isAdmin: true,
    },
  });
  console.log("Admin user seeded.");

  // 2. Create Confirm Channel
  await prisma.confirmChannel.upsert({
    where: { channelId: "@DevlogUz" },
    update: {},
    create: {
      channelId: "@DevlogUz",
      title: "DevlogUz",
      inviteLink: "https://t.me/DevlogUz",
    },
  });
  console.log("Required subscription channel seeded.");

  // 3. Create VehicleModels (used as categories)
  const modelsData = [
    { nameUz: "Mebel", nameRu: "Мебель" },
    { nameUz: "Elektronika", nameRu: "Электроника" },
    { nameUz: "Maishiy texnika", nameRu: "Бытовая техника" },
    { nameUz: "Kiyim", nameRu: "Одежда" },
    { nameUz: "Poyabzallar", nameRu: "Обувь" },
    { nameUz: "Aksessuarlar", nameRu: "Аксессуары" },
    { nameUz: "Go'zallik", nameRu: "Красота" },
    { nameUz: "Salomatlik", nameRu: "Здоровье" },
    { nameUz: "Oshxona Jihozlar", nameRu: "Кухонные приборы" },
  ];

  const createdModels: any[] = [];
  for (const m of modelsData) {
    const model = await prisma.vehicleModel.upsert({
      where: { id: 0 },
      update: {},
      create: m,
    });
    createdModels.push(model);
    console.log(`Created model: ${model.nameUz}`);
  }

  // 4. Create Products with realistic data
  const productsData = [
    // Mebel
    {
      modelId: createdModels.find(m => m.nameUz === "Mebel")?.id,
      nameUz: "Zamonaviy uch o'rindiqli divan",
      nameRu: "Современный трехместный диван",
      descUz: "Qulay va zamonaviy dizaynli divan. Kulrang rangda.",
      descRu: "Удобный и современный диван. Серый цвет.",
      price: 2500000,
    },
    {
      modelId: createdModels.find(m => m.nameUz === "Mebel")?.id,
      nameUz: "Burchak divan",
      nameRu: "Угловой диван",
      descUz: "Katta xonalar uchun mukammal tanlov. Jilg'iz funksiyasi bor.",
      descRu: "Отличный выбор для больших комнат. Есть функция раскладывания.",
      price: 3500000,
    },
    {
      modelId: createdModels.find(m => m.nameUz === "Mebel")?.id,
      nameUz: "Oshxona stoli",
      nameRu: "Кухонный стол",
      descUz: "4 kishilik daraxt stoli. Oq rangda.",
      descRu: "Деревянный стол на 4 человека. Белый цвет.",
      price: 800000,
    },
    // Elektronika
    {
      modelId: createdModels.find(m => m.nameUz === "Elektronika")?.id,
      nameUz: "Smartphone Pro Max",
      nameRu: "Смартфон Pro Max",
      descUz: "6.7 dyuymli ekran, 256GB xotira, 12MP kamera.",
      descRu: "Экран 6.7 дюйма, память 256ГБ, камера 12МП.",
      price: 8500000,
    },
    {
      modelId: createdModels.find(m => m.nameUz === "Elektronika")?.id,
      nameUz: "Smartphone Lite",
      nameRu: "Смартфон Lite",
      descUz: "6.1 dyuymli ekran, 128GB xotira, 8MP kamera.",
      descRu: "Экран 6.1 дюйма, память 128ГБ, камера 8МП.",
      price: 4500000,
    },
    {
      modelId: createdModels.find(m => m.nameUz === "Elektronika")?.id,
      nameUz: "Gaming Laptop",
      nameRu: "Игровой ноутбук",
      descUz: "Intel Core i7, 16GB RAM, 512GB SSD, RTX 3060.",
      descRu: "Intel Core i7, 16ГБ ОЗУ, 512ГБ SSD, RTX 3060.",
      price: 12000000,
    },
    // Maishiy texnika
    {
      modelId: createdModels.find(m => m.nameUz === "Maishiy texnika")?.id,
      nameUz: "Inverter konditsioner",
      nameRu: "Инверторный кондиционер",
      descUz: "12000 BTU, energiya tejash, uzoq masofadan boshqarish.",
      descRu: "12000 БТЕ, энергосбережение, пульт дистанционного управления.",
      price: 3500000,
    },
    {
      modelId: createdModels.find(m => m.nameUz === "Maishiy texnika")?.id,
      nameUz: "Ikki eshikli muzlatgich",
      nameRu: "Двухдверный холодильник",
      descUz: "400 litr, No Frost, A++ energiya klassi.",
      descRu: "400 литров, No Frost, класс энергопотребления A++.",
      price: 4200000,
    },
    // Kiyim
    {
      modelId: createdModels.find(m => m.nameUz === "Kiyim")?.id,
      nameUz: "Cotton t-shirt",
      nameRu: "Хлопковая футболка",
      descUz: "100% paxta, turli ranglar va o'lchamlar.",
      descRu: "100% хлопок, различные цвета и размеры.",
      price: 150000,
    },
    {
      modelId: createdModels.find(m => m.nameUz === "Kiyim")?.id,
      nameUz: "Jeans shim",
      nameRu: "Джинсы",
      descUz: "Classic fit, ko'k rangda.",
      descRu: "Classic fit, синий цвет.",
      price: 350000,
    },
    // Poyabzallar
    {
      modelId: createdModels.find(m => m.nameUz === "Poyabzallar")?.id,
      nameUz: "Sport krossovkalar",
      nameRu: "Спортивные кроссовки",
      descUz: "Yengil va qulay, mesh qismi.",
      descRu: "Легкие и удобные, сетчатая часть.",
      price: 650000,
    },
    // Aksessuarlar
    {
      modelId: createdModels.find(m => m.nameUz === "Aksessuarlar")?.id,
      nameUz: "Smart Watch",
      nameRu: "Смарт-часы",
      descUz: "Qadam sanagich, puls o'lchagich, suvga chidamli.",
      descRu: "Шагомер, пульсометр, водонепроницаемый.",
      price: 1200000,
    },
    // Go'zallik
    {
      modelId: createdModels.find(m => m.nameUz === "Go'zallik")?.id,
      nameUz: "Parfyum 100ml",
      nameRu: "Парфюм 100мл",
      descUz: "Uzoq davom etgan xushbo'ylik.",
      descRu: "Долговечный аромат.",
      price: 890000,
    },
    // Salomatlik
    {
      modelId: createdModels.find(m => m.nameUz === "Salomatlik")?.id,
      nameUz: "Multivitamin kompleksi",
      nameRu: "Мультивитаминный комплекс",
      descUz: "30 ta tabletka, kundalik ehtiyoj uchun.",
      descRu: "30 таблеток, для ежедневной потребности.",
      price: 120000,
    },
    // Oshxona Jihozlar
    {
      modelId: createdModels.find(m => m.nameUz === "Oshxona Jihozlar")?.id,
      nameUz: "Mikroto'lqinli pech",
      nameRu: "Микроволновка",
      descUz: "20 litr, grill funksiyasi.",
      descRu: "20 литров, функция гриля.",
      price: 950000,
    },
    {
      modelId: createdModels.find(m => m.nameUz === "Oshxona Jihozlar")?.id,
      nameUz: "Portativ blender",
      nameRu: "Портативный блендер",
      descUz: "USB zaryadlash, qulay o'lcham.",
      descRu: "USB зарядка, удобный размер.",
      price: 280000,
    },
  ];

  for (const p of productsData) {
    if (p.modelId) {
      const product = await prisma.product.create({
        data: {
          modelId: p.modelId,
          nameUz: p.nameUz,
          nameRu: p.nameRu,
          descUz: p.descUz,
          descRu: p.descRu,
          price: p.price,
        },
      });
      console.log(`Created product: ${product.nameUz}`);
    }
  }

  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

