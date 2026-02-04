import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface Goal {
  id: string;
  text: string;
  completed: boolean;
}

interface GoalCard {
  id: string;
  title: string;
  emoji: string;
  color: string;
  textColor: string;
  goals: Goal[];
}

const initialCards: GoalCard[] = [
  {
    id: 'career',
    title: 'Career-Professional',
    emoji: '💼',
    color: 'oklch(0.95 0.12 95)',
    textColor: 'oklch(0.3 0.08 95)',
    goals: [
      { id: 'c1', text: 'Python from 0 to hero', completed: false },
      { id: 'c2', text: 'Udemy Course AI', completed: false },
      { id: 'c3', text: 'Python bootcamp', completed: false },
      { id: 'c4', text: 'Deep learning Platzi AA', completed: false },
      { id: 'c5', text: 'Machine learning Platzi', completed: false },
    ],
  },
  {
    id: 'personal',
    title: 'Personal Development',
    emoji: '🚀',
    color: 'oklch(0.92 0.15 55)',
    textColor: 'oklch(0.35 0.12 55)',
    goals: [
      { id: 'p1', text: 'Leer 5 páginas de un libro por día', completed: false },
      { id: 'p2', text: 'Piano : 1 complete song', completed: false },
      { id: 'p3', text: 'Aprender Chino', completed: false },
      { id: 'p4', text: 'Aprender Cubo Rubik', completed: false },
      { id: 'p5', text: 'Cursos de inteligencia emocional', completed: false },
    ],
  },
  {
    id: 'laboral',
    title: 'Laboral - Job',
    emoji: '💼',
    color: 'oklch(0.90 0.15 25)',
    textColor: 'oklch(0.35 0.12 25)',
    goals: [
      { id: 'l1', text: 'Test Manager Certification- ISTQB', completed: false },
      { id: 'l2', text: 'Cibersecurity', completed: false },
      { id: 'l3', text: 'Giving response for Linkedin messages', completed: false },
      { id: 'l4', text: 'Get Remote job in USA - Canada - On November / december', completed: false },
      { id: 'l5', text: 'Update mi CV', completed: false },
    ],
  },
  {
    id: 'family',
    title: 'Family and Sentimental',
    emoji: '💕',
    color: 'oklch(0.92 0.15 350)',
    textColor: 'oklch(0.35 0.12 350)',
    goals: [
      { id: 'f1', text: 'Meet new people', completed: false },
      { id: 'f2', text: 'Visit parents more often', completed: false },
      { id: 'f3', text: 'Spend Quality time with Flore', completed: false },
      { id: 'f4', text: 'Know new Montreal places without Spend too much money', completed: false },
      { id: 'f5', text: 'Bartender', completed: false },
    ],
  },
  {
    id: 'financial',
    title: 'Financial',
    emoji: '💰',
    color: 'oklch(0.90 0.15 285)',
    textColor: 'oklch(0.35 0.12 285)',
    goals: [
      { id: 'fi1', text: 'Ahorrar para objetivos grandes (propiedad, viajes)', completed: false },
      { id: 'fi2', text: 'Get Infinite card Canada with benefits for traveling around the world', completed: false },
      { id: 'fi3', text: 'Expand my line of credit Canada', completed: false },
      { id: 'fi4', text: 'Use wisely credit card Canada', completed: false },
      { id: 'fi5', text: 'Olivo -importaciones - Peru - Negocio', completed: false },
    ],
  },
  {
    id: 'health',
    title: 'Health',
    emoji: '🏃',
    color: 'oklch(0.92 0.12 220)',
    textColor: 'oklch(0.30 0.10 220)',
    goals: [
      { id: 'h1', text: 'Learn how to use insurance health', completed: false },
      { id: 'h2', text: 'Tiempo sólo para mi- una vez a la semana', completed: false },
      { id: 'h3', text: 'Drink water 2 L: 2 vasos antes de hacer ejercicio, 2 vasos antes del desayuno, 2-vasos antes del almuerzo y 2 vasos 2 horas antes de dormir', completed: true },
      { id: 'h4', text: 'skincare - Mañana y noche', completed: false },
      { id: 'h5', text: 'Increase level of iron', completed: false },
    ],
  },
  {
    id: 'academic',
    title: 'Academic - University',
    emoji: '🎓',
    color: 'oklch(0.93 0.12 145)',
    textColor: 'oklch(0.30 0.10 145)',
    goals: [
      { id: 'a1', text: 'Pass with A+ each course', completed: false },
      { id: 'a2', text: 'Get Scholarship for GPA more than 4.3', completed: false },
      { id: 'a3', text: 'Get GPA 5', completed: false },
      { id: 'a4', text: 'Estudiar para certificaciones técnicas', completed: false },
    ],
  },
];

export default function GoalsDashboard() {
  const [cards, setCards] = useState<GoalCard[]>(initialCards);

  const toggleGoal = (cardId: string, goalId: string) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              goals: card.goals.map((goal) =>
                goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
              ),
            }
          : card
      )
    );
  };

  const shouldEnableScroll = cards.length > 7;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-black py-4">
        <h1 className="text-center text-white text-2xl font-lora-italic">My Goals : 2026</h1>
      </header>

      {/* Cards Container */}
      <main className="p-6">
        <div
          className={`flex gap-4 ${
            shouldEnableScroll ? 'overflow-x-auto' : 'overflow-x-hidden'
          }`}
          style={{ flexWrap: 'nowrap' }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex-shrink-0 rounded-lg shadow-md"
              style={{
                width: '280px',
                backgroundColor: 'white',
                border: '1px solid oklch(0.9 0 0)',
              }}
            >
              {/* Card Header */}
              <div
                className="rounded-t-lg px-4 py-3 text-center font-lora-italic font-semibold"
                style={{
                  backgroundColor: card.color,
                  color: card.textColor,
                }}
              >
                <span className="mr-2">{card.emoji}</span>
                {card.title}
              </div>

              {/* Card Body */}
              <div className="p-4">
                {card.goals.map((goal, index) => (
                  <div key={goal.id}>
                    <div className="flex items-start gap-3 py-3">
                      <Checkbox
                        id={goal.id}
                        checked={goal.completed}
                        onCheckedChange={() => toggleGoal(card.id, goal.id)}
                        className="mt-1 flex-shrink-0"
                      />
                      <label
                        htmlFor={goal.id}
                        className={`flex-1 cursor-pointer font-lora-italic text-sm leading-relaxed ${
                          goal.completed ? 'opacity-60' : ''
                        }`}
                        style={{ color: 'oklch(0.2 0 0)' }}
                      >
                        {goal.text}
                      </label>
                    </div>
                    {index < card.goals.length - 1 && (
                      <div
                        className="border-t"
                        style={{ borderStyle: 'dashed', borderColor: 'oklch(0.85 0 0)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* See goals per month button */}
          <div className="flex-shrink-0 flex items-center">
            <Button
              variant="outline"
              className="h-auto whitespace-nowrap font-lora-italic"
              style={{
                minHeight: '60px',
                padding: '0 24px',
              }}
            >
              See goals per month
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p className="font-lora-italic">
          © 2026. Built with love using{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
