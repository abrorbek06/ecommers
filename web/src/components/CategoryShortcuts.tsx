import { Link } from 'react-router-dom';

interface CategoryShortcut {
  name: string;
  nameUz: string;
  nameRu: string;
  icon: string;
  color: string;
}

const shortcuts: CategoryShortcut[] = [
  { name: 'Onalar va bolalar', nameUz: 'Onalar va bolalar', nameRu: 'Мамы и дети', icon: '👶', color: 'bg-pink-100' },
  { name: 'Futbol', nameUz: 'Futbol', nameRu: 'Футбол', icon: '⚽', color: 'bg-green-100' },
  { name: 'Zamonaviy bozor', nameUz: 'Zamonaviy bozor', nameRu: 'Современный рынок', icon: '🏪', color: 'bg-blue-100' },
  { name: 'Yozgi chegirmalar', nameUz: 'Yozgi chegirmalar', nameRu: 'Летние скидки', icon: '☀️', color: 'bg-yellow-100' },
];

interface CategoryShortcutsProps {
  language?: 'uz' | 'ru';
}

export function CategoryShortcuts({ language = 'uz' }: CategoryShortcutsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {shortcuts.map((shortcut) => (
        <Link
          key={shortcut.name}
          to={`/catalog?search=${shortcut.name}`}
          className={`${shortcut.color} rounded-xl p-4 hover:opacity-80 transition-opacity`}
        >
          <div className="flex flex-col items-center text-center">
            <span className="text-4xl mb-2">{shortcut.icon}</span>
            <span className="text-sm font-medium text-gray-900">
              {language === 'ru' ? shortcut.nameRu : shortcut.nameUz}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
