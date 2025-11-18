import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorInputModalProps {
  open: boolean;
  onClose: () => void;
  athleteName: string;
  entryNumber: number;
  onSave: (errors: 0 | 1 | 2 | 3 | 4 | 5, position: 'prone' | 'standing') => void;
}

export const ErrorInputModal = ({
  open,
  onClose,
  athleteName,
  entryNumber,
  onSave,
}: ErrorInputModalProps) => {
  
  // Vibration feedback
  const vibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleQuickSave = (errors: 0 | 1 | 2 | 3 | 4 | 5, position: 'prone' | 'standing') => {
    vibrate();
    onSave(errors, position);
    onClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const errorButtons: Array<0 | 1 | 2 | 3 | 4 | 5> = [0, 1, 2, 3, 4, 5];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{athleteName} – Schießeinlage #{entryNumber}</DialogTitle>
          <DialogDescription>Fehler (0–5) – Ein Tap speichert sofort</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prone (Liegend) */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Liegend</div>
            <div className="grid grid-cols-3 gap-2">
              {errorButtons.map((errors) => (
                <Button
                  key={`prone-${errors}`}
                  onClick={() => handleQuickSave(errors, 'prone')}
                  variant="outline"
                  size="lg"
                  className={cn(
                    "h-14 text-2xl font-bold transition-all hover:scale-105 active:scale-95"
                  )}
                  aria-label={`Liegend Fehler ${errors}`}
                >
                  {errors}
                </Button>
              ))}
            </div>
          </div>

          {/* Standing (Stehend) */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Stehend</div>
            <div className="grid grid-cols-3 gap-2">
              {errorButtons.map((errors) => (
                <Button
                  key={`standing-${errors}`}
                  onClick={() => handleQuickSave(errors, 'standing')}
                  variant="outline"
                  size="lg"
                  className={cn(
                    "h-14 text-2xl font-bold transition-all hover:scale-105 active:scale-95"
                  )}
                  aria-label={`Stehend Fehler ${errors}`}
                >
                  {errors}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="ghost">
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
