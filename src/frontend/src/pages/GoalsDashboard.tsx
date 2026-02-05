import { useState, useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';
import MonthSelectionModal from '@/components/MonthSelectionModal';
import CenteredNotification from '@/components/CenteredNotification';
import YearlySummaryTable from '@/components/YearlySummaryTable';
import type { Month } from '@/lib/months';

interface Goal {
  id: string;
  text: string;
  completed: boolean;
  month?: Month;
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

const STORAGE_KEY = 'goals-dashboard-cards';

export default function GoalsDashboard() {
  const [cards, setCards] = useState<GoalCard[]>(() => {
    // Load from localStorage on initial mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return initialCards;
      }
    }
    return initialCards;
  });
  const [editingGoal, setEditingGoal] = useState<{ cardId: string; goalId: string } | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // View state: 'dashboard' or 'summary'
  const [view, setView] = useState<'dashboard' | 'summary'>('dashboard');

  // Month selection modal state
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Month | null>(null);
  const [pendingGoal, setPendingGoal] = useState<{ cardId: string; goalId: string } | null>(null);

  // Notification state
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationDuration, setNotificationDuration] = useState(3000);

  // Persist to localStorage whenever cards change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingGoal && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingGoal]);

  const toggleGoal = (cardId: string, goalId: string) => {
    // Find the current goal state
    const card = cards.find((c) => c.id === cardId);
    const goal = card?.goals.find((g) => g.id === goalId);
    
    if (!goal) return;

    // If goal is being checked (transitioning from uncompleted to completed)
    const isBeingChecked = !goal.completed;

    // If unchecking, clear the month assignment
    if (!isBeingChecked) {
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                goals: card.goals.map((goal) =>
                  goal.id === goalId ? { ...goal, completed: false, month: undefined } : goal
                ),
              }
            : card
        )
      );
      return;
    }

    // Update the goal state immediately
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

    // If checking (not unchecking), open the month selection modal
    if (isBeingChecked) {
      setPendingGoal({ cardId, goalId });
      setSelectedMonth(null);
      setMonthModalOpen(true);
    }
  };

  const handleMonthConfirm = () => {
    if (!selectedMonth || !pendingGoal) return;

    // Update the goal with the selected month
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === pendingGoal.cardId
          ? {
              ...card,
              goals: card.goals.map((goal) =>
                goal.id === pendingGoal.goalId ? { ...goal, month: selectedMonth } : goal
              ),
            }
          : card
      )
    );

    // Find the goal text for the notification
    const card = cards.find((c) => c.id === pendingGoal.cardId);
    const goal = card?.goals.find((g) => g.id === pendingGoal.goalId);

    if (goal) {
      // Show notification
      setNotificationMessage(`The goal "${goal.text}" has been added to ${selectedMonth}`);
      setNotificationDuration(3000);
      setNotificationVisible(true);
    }

    // Close modal and reset state
    setMonthModalOpen(false);
    setSelectedMonth(null);
    setPendingGoal(null);
  };

  const handleMonthCancel = () => {
    // Restore the goal to unchecked state
    if (pendingGoal) {
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === pendingGoal.cardId
            ? {
                ...card,
                goals: card.goals.map((goal) =>
                  goal.id === pendingGoal.goalId ? { ...goal, completed: false } : goal
                ),
              }
            : card
        )
      );
    }

    // Close modal and reset state
    setMonthModalOpen(false);
    setSelectedMonth(null);
    setPendingGoal(null);
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      // If modal is being closed (not via Confirm), restore the goal
      handleMonthCancel();
    } else {
      setMonthModalOpen(open);
    }
  };

  const handleUploadSaveSuccess = () => {
    setNotificationMessage('Successfully saved! 📸');
    setNotificationDuration(5000);
    setNotificationVisible(true);
  };

  const startEditing = (cardId: string, goalId: string, currentText: string) => {
    setEditingGoal({ cardId, goalId });
    setEditText(currentText);
  };

  const saveEdit = () => {
    if (!editingGoal) return;

    const trimmedText = editText.trim();
    if (trimmedText) {
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === editingGoal.cardId
            ? {
                ...card,
                goals: card.goals.map((goal) =>
                  goal.id === editingGoal.goalId ? { ...goal, text: trimmedText } : goal
                ),
              }
            : card
        )
      );
    }

    setEditingGoal(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingGoal(null);
    setEditText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const deleteGoal = (cardId: string, goalId: string) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              goals: card.goals.filter((goal) => goal.id !== goalId),
            }
          : card
      )
    );
  };

  const addGoal = (cardId: string) => {
    const newGoalId = `${cardId}-${Date.now()}`;
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              goals: [
                ...card.goals,
                { id: newGoalId, text: 'New goal', completed: false },
              ],
            }
          : card
      )
    );
    // Start editing the new goal immediately
    setTimeout(() => {
      startEditing(cardId, newGoalId, 'New goal');
    }, 0);
  };

  const shouldEnableScroll = cards.length > 7;

  // If in summary view, render the table
  if (view === 'summary') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-black py-4">
          <h1 className="text-center text-white text-2xl font-lora-italic">LIFETIME GOALS</h1>
        </header>

        {/* Yearly Summary Table */}
        <main className="p-6">
          <YearlySummaryTable 
            cards={cards} 
            onBackToDashboard={() => setView('dashboard')}
            onUploadSaveSuccess={handleUploadSaveSuccess}
          />
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

        {/* Centered Notification */}
        <CenteredNotification
          message={notificationMessage}
          visible={notificationVisible}
          onDismiss={() => setNotificationVisible(false)}
          duration={notificationDuration}
        />
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-black py-4">
        <h1 className="text-center text-white text-2xl font-lora-italic">LIFETIME GOALS</h1>
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
                className="rounded-t-lg px-4 py-3 text-center font-lora-italic font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: card.color,
                  color: card.textColor,
                }}
              >
                <span className="mr-1">{card.emoji}</span>
                <span>{card.title}</span>
              </div>

              {/* Card Body */}
              <div className="p-4">
                {card.goals.map((goal, index) => {
                  const isLastGoal = index === card.goals.length - 1;
                  return (
                    <div key={goal.id}>
                      <div className="group flex items-start gap-3 py-3 focus-within:bg-muted/30 hover:bg-muted/30 rounded transition-colors relative">
                        <Checkbox
                          id={goal.id}
                          checked={goal.completed}
                          onCheckedChange={() => toggleGoal(card.id, goal.id)}
                          className="mt-1 flex-shrink-0"
                        />
                        {editingGoal?.cardId === card.id && editingGoal?.goalId === goal.id ? (
                          <Input
                            ref={inputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            className="flex-1 font-lora-italic text-sm leading-relaxed h-auto py-1 px-2"
                            style={{ color: 'oklch(0.2 0 0)' }}
                          />
                        ) : (
                          <label
                            htmlFor={goal.id}
                            onClick={(e) => {
                              e.preventDefault();
                              startEditing(card.id, goal.id, goal.text);
                            }}
                            className={`flex-1 cursor-pointer font-lora-italic text-sm leading-relaxed pr-16 ${
                              goal.completed ? 'opacity-60' : ''
                            }`}
                            style={{ color: 'oklch(0.2 0 0)' }}
                          >
                            {goal.text}
                          </label>
                        )}
                        
                        {/* Action buttons - always reserve space, show on hover/focus-within */}
                        <div className="absolute right-0 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          {isLastGoal && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => addGoal(card.id)}
                              aria-label="Add new goal"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => deleteGoal(card.id, goal.id)}
                            aria-label="Delete goal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {index < card.goals.length - 1 && (
                        <div
                          className="border-t"
                          style={{ borderStyle: 'dashed', borderColor: 'oklch(0.85 0 0)' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* See goals per month button - below cards */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="default"
            size="lg"
            className="font-lora-italic"
            onClick={() => setView('summary')}
          >
            See goals per month
          </Button>
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

      {/* Month Selection Modal */}
      <MonthSelectionModal
        open={monthModalOpen}
        onOpenChange={handleModalOpenChange}
        selectedMonth={selectedMonth}
        onMonthSelect={setSelectedMonth}
        onConfirm={handleMonthConfirm}
        onCancel={handleMonthCancel}
      />

      {/* Centered Notification */}
      <CenteredNotification
        message={notificationMessage}
        visible={notificationVisible}
        onDismiss={() => setNotificationVisible(false)}
        duration={notificationDuration}
      />
    </div>
  );
}
