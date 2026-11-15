/**
 * Service categories and typical jobs with price ranges (so'm).
 * TODO(Botir): check prices with real masters in Khorezm before the pilot.
 */

type Names = [uzLatn: string, uzCyrl: string, ru: string];

export interface PriceSeed {
  slug: string;
  name: Names;
  min: number;
  max: number;
}

export interface CategorySeed {
  slug: string;
  name: Names;
  /** MaterialCommunityIcons name. */
  icon: string;
  prices: PriceSeed[];
}

const p = (slug: string, name: Names, min: number, max: number): PriceSeed => ({
  slug,
  name,
  min,
  max,
});

export const CATEGORIES: CategorySeed[] = [
  {
    slug: 'plumber',
    name: ['Santexnik', 'Сантехник', 'Сантехник'],
    icon: 'pipe-wrench',
    prices: [
      p(
        'plumber-faucet',
        ['Kran almashtirish', 'Кран алмаштириш', 'Замена смесителя'],
        80_000,
        150_000,
      ),
      p(
        'plumber-toilet',
        ["Unitaz o'rnatish", 'Унитаз ўрнатиш', 'Установка унитаза'],
        150_000,
        300_000,
      ),
      p(
        'plumber-leak',
        ['Quvur oqishini tuzatish', 'Қувур оқишини тузатиш', 'Устранение протечки трубы'],
        100_000,
        250_000,
      ),
      p(
        'plumber-drain',
        ['Kanalizatsiyani tozalash', 'Канализацияни тозалаш', 'Прочистка канализации'],
        100_000,
        250_000,
      ),
      p(
        'plumber-heater',
        ["Suv isitgich o'rnatish", 'Сув иситгич ўрнатиш', 'Установка водонагревателя'],
        150_000,
        350_000,
      ),
    ],
  },
  {
    slug: 'electrician',
    name: ['Elektrik', 'Электрик', 'Электрик'],
    icon: 'flash',
    prices: [
      p(
        'electrician-socket',
        [
          "Rozetka o'rnatish yoki almashtirish",
          'Розетка ўрнатиш ёки алмаштириш',
          'Установка или замена розетки',
        ],
        40_000,
        80_000,
      ),
      p(
        'electrician-light',
        ["Lyustra o'rnatish", 'Люстра ўрнатиш', 'Установка люстры'],
        80_000,
        200_000,
      ),
      p(
        'electrician-breaker',
        ['Avtomat (schitok) almashtirish', 'Автомат (щиток) алмаштириш', 'Замена автомата в щитке'],
        80_000,
        200_000,
      ),
      p(
        'electrician-fault',
        [
          'Nosozlikni topish va tuzatish',
          'Носозликни топиш ва тузатиш',
          'Поиск и устранение неисправности',
        ],
        100_000,
        300_000,
      ),
    ],
  },
  {
    slug: 'air-conditioner',
    name: ['Konditsioner', 'Кондиционер', 'Кондиционеры'],
    icon: 'air-conditioner',
    prices: [
      p(
        'ac-install',
        ["Konditsioner o'rnatish", 'Кондиционер ўрнатиш', 'Установка кондиционера'],
        300_000,
        600_000,
      ),
      p(
        'ac-service',
        ["Tozalash va xizmat ko'rsatish", 'Тозалаш ва хизмат кўрсатиш', 'Чистка и обслуживание'],
        150_000,
        300_000,
      ),
      p('ac-freon', ["Freon to'ldirish", 'Фреон тўлдириш', 'Заправка фреоном'], 200_000, 450_000),
      p(
        'ac-repair',
        [
          "Ta'mirlash (diagnostika bilan)",
          'Таъмирлаш (диагностика билан)',
          'Ремонт (с диагностикой)',
        ],
        150_000,
        500_000,
      ),
    ],
  },
  {
    slug: 'washing-machine',
    name: ['Kir yuvish mashinasi', 'Кир ювиш машинаси', 'Стиральные машины'],
    icon: 'washing-machine',
    prices: [
      p('wm-diagnostics', ['Diagnostika', 'Диагностика', 'Диагностика'], 50_000, 100_000),
      p('wm-pump', ['Nasos almashtirish', 'Насос алмаштириш', 'Замена насоса'], 150_000, 300_000),
      p(
        'wm-bearing',
        ['Podshipnik almashtirish', 'Подшипник алмаштириш', 'Замена подшипников'],
        300_000,
        600_000,
      ),
      p(
        'wm-install',
        ["O'rnatish va ulash", 'Ўрнатиш ва улаш', 'Установка и подключение'],
        100_000,
        200_000,
      ),
    ],
  },
  {
    slug: 'fridge',
    name: ['Muzlatgich', 'Музлатгич', 'Холодильники'],
    icon: 'fridge',
    prices: [
      p('fridge-diagnostics', ['Diagnostika', 'Диагностика', 'Диагностика'], 50_000, 100_000),
      p(
        'fridge-freon',
        ["Freon to'ldirish", 'Фреон тўлдириш', 'Заправка фреоном'],
        250_000,
        500_000,
      ),
      p(
        'fridge-thermostat',
        ['Termostat almashtirish', 'Термостат алмаштириш', 'Замена термостата'],
        150_000,
        300_000,
      ),
      p(
        'fridge-compressor',
        ['Kompressor almashtirish', 'Компрессор алмаштириш', 'Замена компрессора'],
        600_000,
        1_200_000,
      ),
    ],
  },
  {
    slug: 'gas-boiler',
    name: ['Gaz qozon', 'Газ қозон', 'Газовые котлы'],
    icon: 'water-boiler',
    prices: [
      p(
        'boiler-service',
        ['Tozalash va sozlash', 'Тозалаш ва созлаш', 'Чистка и настройка'],
        150_000,
        300_000,
      ),
      p(
        'boiler-repair',
        [
          "Ta'mirlash (diagnostika bilan)",
          'Таъмирлаш (диагностика билан)',
          'Ремонт (с диагностикой)',
        ],
        150_000,
        500_000,
      ),
      p(
        'boiler-install',
        ["Qozon o'rnatish", 'Қозон ўрнатиш', 'Установка котла'],
        400_000,
        900_000,
      ),
    ],
  },
  {
    slug: 'furniture',
    name: ["Mebel yig'ish", 'Мебель йиғиш', 'Сборка мебели'],
    icon: 'sofa',
    prices: [
      p('furniture-wardrobe', ["Shkaf yig'ish", 'Шкаф йиғиш', 'Сборка шкафа'], 150_000, 400_000),
      p('furniture-bed', ["Krovat yig'ish", 'Кровать йиғиш', 'Сборка кровати'], 100_000, 250_000),
      p(
        'furniture-kitchen',
        ["Oshxona mebelini yig'ish", 'Ошхона мебелини йиғиш', 'Сборка кухни'],
        400_000,
        1_000_000,
      ),
    ],
  },
  {
    slug: 'other',
    name: ['Boshqa', 'Бошқа', 'Другое'],
    icon: 'tools',
    prices: [
      p('other-hour', ['Usta bir soatga', 'Уста бир соатга', 'Мастер на час'], 80_000, 150_000),
      p(
        'other-shelf',
        ['Javon yoki parda osish', 'Жавон ёки парда осиш', 'Повесить полку или шторы'],
        50_000,
        150_000,
      ),
    ],
  },
];
