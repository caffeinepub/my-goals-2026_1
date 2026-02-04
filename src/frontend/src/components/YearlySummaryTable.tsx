import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';
import { MONTHS, type Month } from '@/lib/months';
import MonthlyProgressDonut from './MonthlyProgressDonut';
import MonthlyCompletionCelebrationModal from './MonthlyCompletionCelebrationModal';

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

interface YearlySummaryTableProps {
  cards: GoalCard[];
  onBackToDashboard: () => void;
}

export default function YearlySummaryTable({ cards, onBackToDashboard }: YearlySummaryTableProps) {
  // Local state for checkbox toggles (UI-only, not persisted)
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  
  // Celebration modal state
  const [celebrationModalOpen, setCelebrationModalOpen] = useState(false);
  const [celebratingMonth, setCelebratingMonth] = useState<Month | null>(null);
  
  // Track previous completion status for each month to detect transitions
  const previousCompletionRef = useRef<Partial<Record<Month, boolean>>>({});

  // Build a map of category -> month -> goals with cardId
  const categoryMonthGoals = new Map<string, Map<Month, Array<Goal & { cardId: string }>>>();

  cards.forEach((card) => {
    const monthMap = new Map<Month, Array<Goal & { cardId: string }>>();
    
    card.goals.forEach((goal) => {
      if (goal.completed && goal.month) {
        const existing = monthMap.get(goal.month) || [];
        monthMap.set(goal.month, [...existing, { ...goal, cardId: card.id }]);
      }
    });

    categoryMonthGoals.set(card.id, monthMap);
  });

  const handleCheckboxToggle = (checkboxId: string) => {
    setCheckedState((prev) => ({
      ...prev,
      [checkboxId]: !prev[checkboxId],
    }));
  };

  // Calculate statistics per month
  const calculateMonthStatistics = (month: Month) => {
    let totalGoals = 0;
    let checkedGoals = 0;

    cards.forEach((card) => {
      const monthMap = categoryMonthGoals.get(card.id);
      const goals = monthMap?.get(month) || [];
      
      goals.forEach((goal) => {
        const checkboxId = `${goal.cardId}-${goal.id}-${month}`;
        totalGoals++;
        if (checkedState[checkboxId]) {
          checkedGoals++;
        }
      });
    });

    if (totalGoals === 0) {
      return { completed: 0, incomplete: 0, progress: 0, isComplete: false };
    }

    const completedPercentage = Math.round((checkedGoals / totalGoals) * 100);
    const incompletePercentage = 100 - completedPercentage;
    const progress = checkedGoals / totalGoals;
    const isComplete = checkedGoals === totalGoals;

    return { completed: completedPercentage, incomplete: incompletePercentage, progress, isComplete };
  };

  // Detect 100% completion transitions
  useEffect(() => {
    const currentCompletion: Partial<Record<Month, boolean>> = {};
    
    MONTHS.forEach((month) => {
      const stats = calculateMonthStatistics(month);
      currentCompletion[month] = stats.isComplete;
      
      // Check if this month just reached 100% (transition from false to true)
      const wasComplete = previousCompletionRef.current[month] || false;
      const isNowComplete = stats.isComplete;
      
      if (!wasComplete && isNowComplete) {
        // Month just reached 100% - open celebration modal
        setCelebratingMonth(month);
        setCelebrationModalOpen(true);
      }
    });
    
    // Update the ref for next comparison
    previousCompletionRef.current = currentCompletion;
  }, [checkedState]); // Re-run when checkbox state changes

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBackToDashboard}
          className="font-lora-italic"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Button>
        <h2 className="text-2xl font-lora-italic font-semibold">Time-Bound targets - 2026</h2>
        <div className="w-[140px]" /> {/* Spacer for centering */}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="yearly-summary-table w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-600 text-white font-lora-italic font-semibold px-4 py-2 text-left min-w-[200px]">
                Category
              </th>
              {MONTHS.map((month, index) => {
                // Generate distinct light tinted backgrounds for each month
                const hue = (index * 30) % 360;
                const bgColor = `oklch(0.95 0.05 ${hue})`;
                
                return (
                  <th
                    key={month}
                    className="border border-gray-300 font-lora-italic font-semibold px-3 py-2 text-center min-w-[100px]"
                    style={{ backgroundColor: bgColor }}
                  >
                    {month.toUpperCase()}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => {
              const monthMap = categoryMonthGoals.get(card.id);
              
              return (
                <tr key={card.id}>
                  <td
                    className="border border-gray-300 px-4 py-3 font-lora-italic font-semibold"
                    style={{
                      backgroundColor: card.color,
                      color: card.textColor,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{card.emoji}</span>
                      <span>{card.title}</span>
                    </div>
                  </td>
                  {MONTHS.map((month, index) => {
                    const goals = monthMap?.get(month) || [];
                    const hue = (index * 30) % 360;
                    const bgColor = `oklch(0.98 0.02 ${hue})`;
                    
                    return (
                      <td
                        key={month}
                        className="border border-gray-300 px-3 py-2 align-top"
                        style={{ backgroundColor: bgColor }}
                      >
                        {goals.length > 0 && (
                          <div className="space-y-2">
                            {goals.map((goal) => {
                              const checkboxId = `${goal.cardId}-${goal.id}-${month}`;
                              const isChecked = checkedState[checkboxId] || false;
                              
                              return (
                                <div
                                  key={goal.id}
                                  className="flex items-start gap-2.5 p-1 rounded hover:bg-black/5 transition-colors"
                                >
                                  <Checkbox
                                    id={checkboxId}
                                    checked={isChecked}
                                    onCheckedChange={() => handleCheckboxToggle(checkboxId)}
                                    className="summary-table-checkbox mt-0.5 flex-shrink-0"
                                  />
                                  <label
                                    htmlFor={checkboxId}
                                    className="text-xs font-lora-italic leading-relaxed flex-1 cursor-pointer select-none"
                                    style={{ color: 'oklch(0.2 0 0)' }}
                                  >
                                    {goal.text}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Statistics Section */}
            <tr className="statistics-section-header">
              <td className="border border-gray-300 px-4 py-3 font-lora-italic font-bold text-base">
                Statistics:
              </td>
              {MONTHS.map((month) => (
                <td
                  key={month}
                  className="border border-gray-300 px-3 py-2"
                />
              ))}
            </tr>

            <tr className="statistics-section-row">
              <td className="border border-gray-300 px-4 py-2 font-lora-italic">
                Percentage completed
              </td>
              {MONTHS.map((month) => {
                const stats = calculateMonthStatistics(month);
                return (
                  <td
                    key={month}
                    className="border border-gray-300 px-3 py-2 text-center font-lora-italic font-semibold"
                  >
                    {stats.completed}%
                  </td>
                );
              })}
            </tr>

            <tr className="statistics-section-row">
              <td className="border border-gray-300 px-4 py-2 font-lora-italic">
                Incomplete percentage
              </td>
              {MONTHS.map((month) => {
                const stats = calculateMonthStatistics(month);
                return (
                  <td
                    key={month}
                    className="border border-gray-300 px-3 py-2 text-center font-lora-italic font-semibold"
                  >
                    {stats.incomplete}%
                  </td>
                );
              })}
            </tr>

            {/* Monthly Progress Donut Row */}
            <tr className="statistics-section-row">
              <td className="border border-gray-300 px-4 py-2 font-lora-italic">
                Monthly progress
              </td>
              {MONTHS.map((month, index) => {
                const stats = calculateMonthStatistics(month);
                const hue = (index * 30) % 360;
                const donutColor = `oklch(0.65 0.15 ${hue})`;
                
                return (
                  <td
                    key={month}
                    className="border border-gray-300 px-3 py-3 text-center"
                  >
                    <MonthlyProgressDonut 
                      progress={stats.progress} 
                      color={donutColor}
                      size={60}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Celebration Modal */}
      <MonthlyCompletionCelebrationModal
        open={celebrationModalOpen}
        onOpenChange={setCelebrationModalOpen}
        month={celebratingMonth || ''}
      />
    </div>
  );
}
