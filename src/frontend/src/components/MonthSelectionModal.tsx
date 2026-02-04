import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MONTHS, type Month } from '@/lib/months';

interface MonthSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMonth: Month | null;
  onMonthSelect: (month: Month) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function MonthSelectionModal({
  open,
  onOpenChange,
  selectedMonth,
  onMonthSelect,
  onConfirm,
  onCancel,
}: MonthSelectionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            In which month do you want to add this goal?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select a month for your goal
          </DialogDescription>
        </DialogHeader>

        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-3 py-6">
          {MONTHS.map((month) => (
            <Button
              key={month}
              variant={selectedMonth === month ? 'default' : 'outline'}
              className="h-12 font-lora-italic"
              onClick={() => onMonthSelect(month)}
            >
              {month}
            </Button>
          ))}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="font-lora-italic"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            disabled={!selectedMonth}
            className="font-lora-italic"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
