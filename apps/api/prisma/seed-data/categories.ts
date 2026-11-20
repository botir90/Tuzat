/**
 * Service categories (trades), grouped as on design/screens/Categories.html,
 * with typical jobs and price ranges (so'm).
 *
 * After the first seed, categories are managed in the admin panel: re-running the seed
 * updates names/icons/prices of these slugs but never deletes what admins added.
 * TODO(Botir): check the prices with real masters in Khorezm before the pilot.
 */
import type { CategoryColor, CategoryIcon } from '@usta/shared';

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
  icon: CategoryIcon;
  color: CategoryColor;
  prices: PriceSeed[];
}

export interface GroupSeed {
  slug: string;
  name: Names;
  categories: CategorySeed[];
}

const p = (slug: string, name: Names, min: number, max: number): PriceSeed => ({
  slug,
  name,
  min,
  max,
});

export const CATEGORY_GROUPS: GroupSeed[] = [
  {
    slug: 'repair',
    name: ["Ta'mirlash", 'Таъмирлаш', 'Ремонт'],
    categories: [
      {
        slug: 'plumber',
        name: ['Santexnik', 'Сантехник', 'Сантехник'],
        icon: 'droplet',
        color: 'blue',
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
        icon: 'zap',
        color: 'gold',
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
            [
              'Avtomat (schitok) almashtirish',
              'Автомат (щиток) алмаштириш',
              'Замена автомата в щитке',
            ],
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
        icon: 'snowflake',
        color: 'cyan',
        prices: [
          p(
            'ac-install',
            ["Konditsioner o'rnatish", 'Кондиционер ўрнатиш', 'Установка кондиционера'],
            300_000,
            600_000,
          ),
          p(
            'ac-service',
            [
              "Tozalash va xizmat ko'rsatish",
              'Тозалаш ва хизмат кўрсатиш',
              'Чистка и обслуживание',
            ],
            150_000,
            300_000,
          ),
          p(
            'ac-freon',
            ["Freon to'ldirish", 'Фреон тўлдириш', 'Заправка фреоном'],
            200_000,
            450_000,
          ),
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
        slug: 'gas-boiler',
        name: ['Gaz qozon, isitish', 'Газ қозон, иситиш', 'Газовые котлы, отопление'],
        icon: 'flame',
        color: 'orange',
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
        slug: 'welder',
        name: ['Payvandchi', 'Пайвандчи', 'Сварщик'],
        icon: 'sparkles',
        color: 'gray',
        prices: [
          p(
            'welder-hour',
            [
              'Payvandlash ishlari (1 soat)',
              'Пайвандлаш ишлари (1 соат)',
              'Сварочные работы (1 час)',
            ],
            150_000,
            300_000,
          ),
        ],
      },
      {
        slug: 'carpenter',
        name: ['Duradgor', 'Дурадгор', 'Плотник'],
        icon: 'hammer',
        color: 'gold',
        prices: [
          p(
            'carpenter-hour',
            [
              'Duradgorlik ishlari (1 soat)',
              'Дурадгорлик ишлари (1 соат)',
              'Плотницкие работы (1 час)',
            ],
            100_000,
            200_000,
          ),
        ],
      },
      {
        slug: 'locksmith',
        name: ['Qulf ustasi', 'Қулф устаси', 'Мастер по замкам'],
        icon: 'lock',
        color: 'violet',
        prices: [
          p(
            'locksmith-replace',
            ['Qulf almashtirish', 'Қулф алмаштириш', 'Замена замка'],
            100_000,
            250_000,
          ),
          p(
            'locksmith-open',
            ['Eshikni ochish', 'Эшикни очиш', 'Вскрытие двери'],
            100_000,
            200_000,
          ),
        ],
      },
      {
        slug: 'water-heater',
        name: ['Suv isitgich', 'Сув иситгич', 'Водонагреватели'],
        icon: 'thermometer',
        color: 'blue',
        prices: [
          p(
            'water-heater-repair',
            ["Suv isitgichni ta'mirlash", 'Сув иситгични таъмирлаш', 'Ремонт водонагревателя'],
            100_000,
            300_000,
          ),
        ],
      },
    ],
  },
  {
    slug: 'construction',
    name: ['Qurilish va pardozlash', 'Қурилиш ва пардозлаш', 'Строительство и отделка'],
    categories: [
      {
        slug: 'painter',
        name: ["Malyar (bo'yoqchi)", 'Маляр (бўёқчи)', 'Маляр'],
        icon: 'paintbrush',
        color: 'pink',
        prices: [
          p(
            'painter-m2',
            ["Devor bo'yash (1 m²)", 'Девор бўяш (1 м²)', 'Покраска стен (1 м²)'],
            15_000,
            30_000,
          ),
        ],
      },
      {
        slug: 'stretch-ceiling',
        name: ['Natyajnoy potolok', 'Натяжной потолок', 'Натяжные потолки'],
        icon: 'panel-top',
        color: 'violet',
        prices: [
          p(
            'stretch-ceiling-m2',
            ['Natyajnoy potolok (1 m²)', 'Натяжной потолок (1 м²)', 'Натяжной потолок (1 м²)'],
            60_000,
            120_000,
          ),
        ],
      },
      {
        slug: 'drywall',
        name: ['Gipsokarton', 'Гипсокартон', 'Гипсокартон'],
        icon: 'square',
        color: 'gray',
        prices: [
          p(
            'drywall-m2',
            [
              'Gipsokarton devor (1 m²)',
              'Гипсокартон девор (1 м²)',
              'Стена из гипсокартона (1 м²)',
            ],
            60_000,
            120_000,
          ),
        ],
      },
      {
        slug: 'tiler',
        name: ['Kafelchi', 'Кафелчи', 'Плиточник'],
        icon: 'grid-2x2',
        color: 'cyan',
        prices: [
          p(
            'tiler-m2',
            ['Kafel terish (1 m²)', 'Кафел териш (1 м²)', 'Укладка плитки (1 м²)'],
            70_000,
            150_000,
          ),
        ],
      },
      {
        slug: 'plasterer',
        name: ['Suvoqchi', 'Сувоқчи', 'Штукатур'],
        icon: 'brush',
        color: 'gold',
        prices: [
          p(
            'plasterer-m2',
            ['Devor suvash (1 m²)', 'Девор сувиш (1 м²)', 'Штукатурка стен (1 м²)'],
            30_000,
            60_000,
          ),
        ],
      },
      {
        slug: 'wallpaper',
        name: ['Oboy yopishtirish', 'Обой ёпиштириш', 'Поклейка обоев'],
        icon: 'scroll',
        color: 'pink',
        prices: [
          p(
            'wallpaper-m2',
            ['Oboy yopishtirish (1 m²)', 'Обой ёпиштириш (1 м²)', 'Поклейка обоев (1 м²)'],
            15_000,
            35_000,
          ),
        ],
      },
      {
        slug: 'flooring',
        name: ['Laminat, parket', 'Ламинат, паркет', 'Ламинат, паркет'],
        icon: 'rows-3',
        color: 'orange',
        prices: [
          p(
            'flooring-m2',
            ['Laminat yotqizish (1 m²)', 'Ламинат ётқизиш (1 м²)', 'Укладка ламината (1 м²)'],
            30_000,
            60_000,
          ),
        ],
      },
      {
        slug: 'pvc-windows',
        name: ['Plastik deraza', 'Пластик дераза', 'Пластиковые окна'],
        icon: 'app-window',
        color: 'blue',
        prices: [
          p(
            'pvc-windows-adjust',
            ['Derazani sozlash', 'Деразани созлаш', 'Регулировка окна'],
            80_000,
            150_000,
          ),
        ],
      },
      {
        slug: 'doors',
        name: ["Eshik o'rnatish", 'Эшик ўрнатиш', 'Установка дверей'],
        icon: 'door-open',
        color: 'teal',
        prices: [
          p(
            'doors-interior',
            ["Ichki eshik o'rnatish", 'Ички эшик ўрнатиш', 'Установка межкомнатной двери'],
            200_000,
            400_000,
          ),
        ],
      },
      {
        slug: 'roofing',
        name: ['Tom yopish', 'Том ёпиш', 'Кровельные работы'],
        icon: 'house',
        color: 'orange',
        prices: [
          p(
            'roofing-m2',
            ["Tom ta'miri (1 m²)", 'Том таъмири (1 м²)', 'Ремонт кровли (1 м²)'],
            50_000,
            120_000,
          ),
        ],
      },
      {
        slug: 'bricklayer',
        name: ["G'isht teruvchi", 'Ғишт терувчи', 'Каменщик'],
        icon: 'brick-wall',
        color: 'gray',
        prices: [
          p(
            'bricklayer-m2',
            ["G'isht terish (1 m²)", 'Ғишт териш (1 м²)', 'Кладка кирпича (1 м²)'],
            60_000,
            120_000,
          ),
        ],
      },
      {
        slug: 'turnkey-renovation',
        name: ['Ta\'mir "kalitda"', 'Таъмир "калитда"', 'Ремонт под ключ'],
        icon: 'key-round',
        color: 'teal',
        prices: [
          p(
            'turnkey-m2',
            ["Kvartira ta'miri (1 m²)", 'Квартира таъмири (1 м²)', 'Ремонт квартиры (1 м²)'],
            800_000,
            2_000_000,
          ),
        ],
      },
    ],
  },
  {
    slug: 'appliances',
    name: ['Maishiy texnika', 'Маиший техника', 'Бытовая техника'],
    categories: [
      {
        slug: 'washing-machine',
        name: ['Kir mashina', 'Кир машина', 'Стиральные машины'],
        icon: 'washing-machine',
        color: 'violet',
        prices: [
          p('wm-diagnostics', ['Diagnostika', 'Диагностика', 'Диагностика'], 50_000, 100_000),
          p(
            'wm-pump',
            ['Nasos almashtirish', 'Насос алмаштириш', 'Замена насоса'],
            150_000,
            300_000,
          ),
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
        icon: 'refrigerator',
        color: 'teal',
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
        slug: 'tv',
        name: ['Televizor', 'Телевизор', 'Телевизоры'],
        icon: 'tv',
        color: 'blue',
        prices: [
          p(
            'tv-diagnostics',
            ['Televizor diagnostikasi', 'Телевизор диагностикаси', 'Диагностика телевизора'],
            50_000,
            100_000,
          ),
        ],
      },
      {
        slug: 'computer',
        name: ['Kompyuter, noutbuk', 'Компьютер, ноутбук', 'Компьютеры, ноутбуки'],
        icon: 'laptop',
        color: 'gray',
        prices: [
          p(
            'computer-windows',
            ["Windows o'rnatish", 'Windows ўрнатиш', 'Установка Windows'],
            80_000,
            150_000,
          ),
        ],
      },
      {
        slug: 'gas-stove',
        name: ['Gaz plita', 'Газ плита', 'Газовые плиты'],
        icon: 'cooking-pot',
        color: 'orange',
        prices: [
          p(
            'gas-stove-repair',
            ["Gaz plitani ta'mirlash", 'Газ плитани таъмирлаш', 'Ремонт газовой плиты'],
            80_000,
            200_000,
          ),
        ],
      },
      {
        slug: 'microwave',
        name: ["Mikroto'lqinli pech", 'Микротўлқинли печ', 'Микроволновые печи'],
        icon: 'microwave',
        color: 'gold',
        prices: [
          p(
            'microwave-repair',
            [
              "Mikroto'lqinli pechni ta'mirlash",
              'Микротўлқинли печни таъмирлаш',
              'Ремонт микроволновки',
            ],
            80_000,
            200_000,
          ),
        ],
      },
      {
        slug: 'cctv',
        name: ['Videokuzatuv', 'Видеокузатув', 'Видеонаблюдение'],
        icon: 'cctv',
        color: 'cyan',
        prices: [
          p(
            'cctv-camera',
            ["Kamera o'rnatish (1 dona)", 'Камера ўрнатиш (1 дона)', 'Установка камеры (1 шт.)'],
            150_000,
            300_000,
          ),
        ],
      },
      {
        slug: 'internet',
        name: ['Internet, antenna', 'Интернет, антенна', 'Интернет, антенны'],
        icon: 'wifi',
        color: 'blue',
        prices: [
          p(
            'internet-router',
            ['Wi-Fi routerni sozlash', 'Wi-Fi роутерни созлаш', 'Настройка Wi-Fi роутера'],
            50_000,
            100_000,
          ),
        ],
      },
    ],
  },
  {
    slug: 'home-services',
    name: ['Mebel va uy xizmatlari', 'Мебель ва уй хизматлари', 'Мебель и услуги для дома'],
    categories: [
      {
        slug: 'furniture',
        name: ["Mebel yig'ish", 'Мебель йиғиш', 'Сборка мебели'],
        icon: 'sofa',
        color: 'pink',
        prices: [
          p(
            'furniture-wardrobe',
            ["Shkaf yig'ish", 'Шкаф йиғиш', 'Сборка шкафа'],
            150_000,
            400_000,
          ),
          p(
            'furniture-bed',
            ["Krovat yig'ish", 'Кровать йиғиш', 'Сборка кровати'],
            100_000,
            250_000,
          ),
          p(
            'furniture-kitchen',
            ["Oshxona mebelini yig'ish", 'Ошхона мебелини йиғиш', 'Сборка кухни'],
            400_000,
            1_000_000,
          ),
        ],
      },
      {
        slug: 'furniture-repair',
        name: ["Mebel ta'miri", 'Мебель таъмири', 'Ремонт мебели'],
        icon: 'armchair',
        color: 'gold',
        prices: [
          p(
            'furniture-repair-basic',
            ["Mebelni ta'mirlash", 'Мебелни таъмирлаш', 'Ремонт мебели'],
            100_000,
            300_000,
          ),
        ],
      },
      {
        slug: 'kitchen-furniture',
        name: ['Oshxona mebeli', 'Ошхона мебели', 'Кухонная мебель'],
        icon: 'utensils',
        color: 'orange',
        prices: [
          p(
            'kitchen-furniture-meter',
            [
              "Oshxona mebelini o'rnatish (1 m)",
              'Ошхона мебелини ўрнатиш (1 м)',
              'Установка кухни (1 м)',
            ],
            150_000,
            300_000,
          ),
        ],
      },
      {
        slug: 'cleaning',
        name: ['Tozalash', 'Тозалаш', 'Уборка'],
        icon: 'spray-can',
        color: 'gray',
        prices: [
          p(
            'cleaning-apartment',
            ['Kvartirani tozalash', 'Квартирани тозалаш', 'Уборка квартиры'],
            300_000,
            700_000,
          ),
        ],
      },
      {
        slug: 'carpet-cleaning',
        name: ['Gilam yuvish', 'Гилам ювиш', 'Стирка ковров'],
        icon: 'waves',
        color: 'violet',
        prices: [
          p(
            'carpet-m2',
            ['Gilam yuvish (1 m²)', 'Гилам ювиш (1 м²)', 'Стирка ковра (1 м²)'],
            15_000,
            25_000,
          ),
        ],
      },
      {
        slug: 'moving',
        name: ['Yuk tashish', 'Юк ташиш', 'Грузоперевозки'],
        icon: 'truck',
        color: 'blue',
        prices: [
          p(
            'moving-hour',
            ['Yuk tashish (1 soat)', 'Юк ташиш (1 соат)', 'Грузоперевозка (1 час)'],
            150_000,
            300_000,
          ),
        ],
      },
      {
        slug: 'gardener',
        name: ["Bog'bon", 'Боғбон', 'Садовник'],
        icon: 'sprout',
        color: 'teal',
        prices: [
          p(
            'gardener-hour',
            ["Bog' parvarishi (1 soat)", 'Боғ парвариши (1 соат)', 'Уход за садом (1 час)'],
            80_000,
            150_000,
          ),
        ],
      },
      {
        slug: 'disinfection',
        name: ['Dezinfeksiya', 'Дезинфекция', 'Дезинфекция'],
        icon: 'bug',
        color: 'cyan',
        prices: [
          p(
            'disinfection-apartment',
            [
              'Kvartirani dezinfeksiya qilish',
              'Квартирани дезинфекция қилиш',
              'Дезинфекция квартиры',
            ],
            300_000,
            600_000,
          ),
        ],
      },
    ],
  },
];

/** "Other / can't find a master": not in a group, always last. */
export const OTHER_CATEGORY: CategorySeed = {
  slug: 'other',
  name: ['Boshqa usta', 'Бошқа уста', 'Другой мастер'],
  icon: 'circle-help',
  color: 'gray',
  prices: [
    p('other-hour', ['Usta bir soatga', 'Уста бир соатга', 'Мастер на час'], 80_000, 150_000),
    p(
      'other-shelf',
      ['Javon yoki parda osish', 'Жавон ёки парда осиш', 'Повесить полку или шторы'],
      50_000,
      150_000,
    ),
  ],
};
