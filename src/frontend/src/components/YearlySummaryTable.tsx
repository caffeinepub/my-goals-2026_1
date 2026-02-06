import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Camera } from 'lucide-react';
import { MONTHS, type Month } from '@/lib/months';
import MonthlyProgressDonut from './MonthlyProgressDonut';
import MonthlyCompletionCelebrationModal from './MonthlyCompletionCelebrationModal';
import MonthlyMemoryShareActions from './MonthlyMemoryShareActions';
import { getAllMonthlyMemories } from '@/lib/monthlyMemoryStorage';

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
  onUploadSaveSuccess?: () => void;
}

export default function YearlySummaryTable({ cards, onBackToDashboard, onUploadSaveSuccess }: YearlySummaryTableProps) {
  // Local state for checkbox toggles (UI-only, not persisted)
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  
  // Celebration modal state
  const [celebrationModalOpen, setCelebrationModalOpen] = useState(false);
  const [celebratingMonth, setCelebratingMonth] = useState<Month | null>(null);
  
  // Track previous completion status for each month to detect transitions
  const previousCompletionRef = useRef<Partial<Record<Month, boolean>>>({});

  // Monthly memories state
  const [monthlyMemories, setMonthlyMemories] = useState<Map<Month, string>>(new Map());

  // Track which months have "Maybe Later" clicked (in-memory only)
  const [maybeLaterMonths, setMaybeLaterMonths] = useState<Set<Month>>(new Set());

  // Load monthly memories on mount
  useEffect(() => {
    setMonthlyMemories(getAllMonthlyMemories());
  }, []);

  // Callback to refresh monthly memories when a new one is saved
  const handleMemorySaved = () => {
    setMonthlyMemories(getAllMonthlyMemories());
  };

  // Callback when "Maybe Later" is clicked
  const handleMaybeLater = (month: Month) => {
    setMaybeLaterMonths((prev) => new Set(prev).add(month));
  };

  // Handler for clicking the placeholder to reopen modal
  const handlePlaceholderClick = (month: Month) => {
    setCelebratingMonth(month);
    setCelebrationModalOpen(true);
  };

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

  // Generate rotation angles for Polaroid effect (alternating slight rotations)
  const getRotationClass = (index: number): string => {
    const rotations = ['polaroid-rotate-left', 'polaroid-rotate-right', 'polaroid-rotate-left-alt', 'polaroid-rotate-right-alt'];
    return rotations[index % rotations.length];
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="default"
          onClick={onBackToDashboard}
          className="font-lora-italic bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-lora-italic font-semibold">Time-Bound targets - 2026</h2>
          <p className="text-sm text-muted-foreground mt-2 font-lora-italic text-center">
            Mark your goals each time you complete one! ...Reach 100% to unlock your victory selfie and share your success.
          </p>
        </div>
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

            {/* Monthly Memory Row */}
            <tr className="monthly-memory-row">
              <td className="border border-gray-300 px-4 py-3 font-lora-italic font-semibold">
                Monthly Memory
              </td>
              {MONTHS.map((month, index) => {
                const memoryImage = monthlyMemories.get(month);
                const stats = calculateMonthStatistics(month);
                const shouldShowThumbnail = memoryImage && stats.isComplete;
                const shouldShowPlaceholder = !memoryImage && maybeLaterMonths.has(month);
                
                return (
                  <td
                    key={month}
                    className="border border-gray-300 px-3 py-4"
                  >
                    {shouldShowThumbnail ? (
                      <div className="monthly-memory-cell-wrapper">
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              className="polaroid-container cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                              aria-label={`View ${month} Memory`}
                            >
                              <div className={`polaroid-frame ${getRotationClass(index)}`}>
                                <img
                                  src={memoryImage}
                                  alt={`${month} memory thumbnail`}
                                  className="polaroid-image"
                                />
                              </div>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
                            <DialogTitle className="sr-only">{month} Memory</DialogTitle>
                            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/90">
                              {/* Share button header */}
                              <div className="absolute top-4 right-4 z-10">
                                <MonthlyMemoryShareActions
                                  imageDataUrl={memoryImage}
                                  month={month}
                                />
                              </div>
                              
                              {/* Image display */}
                              <div className="flex items-center justify-center p-6 w-full h-full">
                                <img
                                  src={memoryImage}
                                  alt={`${month} memory`}
                                  className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : shouldShowPlaceholder ? (
                      <div className="monthly-memory-cell-wrapper">
                        <button
                          onClick={() => handlePlaceholderClick(month)}
                          className="memory-placeholder-button"
                          aria-label={`Add monthly memory for ${month}`}
                        >
                          <Camera className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                        </button>
                      </div>
                    ) : null}
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
        onMemorySaved={handleMemorySaved}
        onUploadSaveSuccess={onUploadSaveSuccess}
        onMaybeLater={handleMaybeLater}
      />
    </div>
  );
}
