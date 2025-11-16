import { useState, useEffect } from "react";
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
  onSave: (errors: 0 | 1 | 2 | 3 | 4 | 5) => void;
}

export const ErrorInputModal = ({
  open,
  onClose,
  athleteName,
  entryNumber,
  onSave,
}: ErrorInputModalProps) => {
  const [selectedErrors, setSelectedErrors] = useState<0 | 1 | 2 | 3 | 4 | 5 | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedErrors(null);
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "5") {
        const errors = parseInt(e.key) as 0 | 1 | 2 | 3 | 4 | 5;
        setSelectedErrors(errors);
      } else if (e.key === "Enter" && selectedErrors !== null) {
        handleSave();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedErrors]);

  const handleSave = () => {
    if (selectedErrors !== null) {
      onSave(selectedErrors);
      onClose();
    }
  };

  const errorButtons: Array<0 | 1 | 2 | 3 | 4 | 5> = [0, 1, 2, 3, 4, 5];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{athleteName} – Schießeinlage #{entryNumber}</DialogTitle>
          <DialogDescription>Fehler (0–5)</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {errorButtons.map((errors) => (
            <Button
              key={errors}
              onClick={() => setSelectedErrors(errors)}
              variant={selectedErrors === errors ? "default" : "outline"}
              size="lg"
              className={cn(
                "h-16 text-2xl font-bold transition-all",
                selectedErrors === errors && "ring-2 ring-primary ring-offset-2"
              )}
              aria-label={`${errors} Fehler`}
            >
              {errors}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button onClick={onClose} variant="ghost">
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={selectedErrors === null}>
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
