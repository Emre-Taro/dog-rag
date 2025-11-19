'use client';

import { Button } from '../../ui/Button';


const dogs = [
  {
    name: 'マックス',
    breed: 'ラブラドール・レトリバー',
    age: '1歳3ヶ月',
    weight: '28.5kg',
    height: '58cm',
    location: '東京センター',
    tag: '盲導犬候補',
    tagColor: 'bg-blue-500/20 text-blue-300',
  },
  {
    name: 'ベラ',
    breed: 'ゴールデン・レトリバー',
    age: '2歳1ヶ月',
    weight: '26.8kg',
    height: '56cm',
    location: '大阪センター',
    tag: '訓練中',
    tagColor: 'bg-amber-500/20 text-amber-300',
  },
  {
    name: 'ルーク',
    breed: 'ラブラドール・レトリバー',
    age: '4歳6ヶ月',
    weight: '30.2kg',
    height: '60cm',
    location: '名古屋センター',
    tag: '現役',
    tagColor: 'bg-emerald-500/20 text-emerald-300',
  },
];

export function DogProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ペット管理</h1>
          <p className="text-sm text-slate-400">担当ペットの情報を管理</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <select className="rounded-lg bg-slate-900 px-3 py-2 text-slate-200">
            <option>すべてのペット</option>
          </select>
          <Button>＋ ペット追加</Button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {dogs.map((dog) => (
          <article key={dog.name} className="rounded-2xl bg-slate-900 p-5 text-xs">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-2xl">
                  🐕
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-50">
                    {dog.name}
                  </div>
                  <div className="text-[11px] text-slate-400">{dog.breed}</div>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${dog.tagColor}`}
              >
                {dog.tag}
              </span>
            </div>

            <dl className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-slate-400">年齢</dt>
                <dd className="text-slate-100">{dog.age}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">体重</dt>
                <dd className="text-slate-100">{dog.weight}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">体高</dt>
                <dd className="text-slate-100">{dog.height}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">所在地</dt>
                <dd className="text-slate-100">{dog.location}</dd>
              </div>
            </dl>

            <Button className="mt-4 w-full">詳細を見る</Button>
          </article>
        ))}
      </section>
    </div>
  );
}