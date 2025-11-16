import { useState } from "react";
import { ShootingRound, Shot } from "@/types/biathlon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShootingRoundCardProps {
  round: ShootingRound;
  onErrorsChange: (errors: number) => void;
  onShotsChange: (shots: Shot[]) => void;
  autoFocus?: boolean;
}

export const ShootingRoundCard = ({
  round,
  onErrorsChange,
  onShotsChange,
  autoFocus,
}: ShootingRoundCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleErrorClick = (errors: number) => {
    onErrorsChange(errors);
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleShotToggle = (index: number) => {
    const newShots = [...round.shots];
    newShots[index] = { hit: !newShots[index].hit };
    onShotsChange(newShots);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <Card className="p-4 min-w-[280px] flex-shrink-0">
      <h3 className="text-lg font-semibold mb-3">
        {round.index}. Schießen
      </h3>

      <div className="mb-3">
        <p className="text-sm text-muted-foreground mb-2">Fehler</p>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((num) => (
            <Button
              key={num}
              onClick={() => handleErrorClick(num)}
              variant={round.errors === num ? "default" : "outline"}
              className={cn(
                "h-14 text-xl font-bold transition-all",
                autoFocus && round.errors === num && "ring-2 ring-accent"
              )}
              aria-label={`${num} Fehler`}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => setShowDetails(!showDetails)}
        variant="ghost"
        className="w-full justify-between"
        aria-expanded={showDetails}
      >
        <span className="text-sm">Treffer einzeln</span>
        {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {showDetails && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {round.shots.map((shot, index) => (
            <button
              key={index}
              onClick={() => handleShotToggle(index)}
              className={cn(
                "aspect-square rounded-full border-2 flex items-center justify-center transition-all active:scale-95",
                shot.hit
                  ? "bg-hit border-hit-foreground text-hit-foreground"
                  : "bg-miss border-miss-foreground text-miss-foreground"
              )}
              aria-label={`Ziel ${index + 1}: ${shot.hit ? "Treffer" : "Fehler"}`}
              style={{ minWidth: "56px", minHeight: "56px" }}
            >
              {shot.hit ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};
