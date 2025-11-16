import { useState } from "react";
import { AthleteSelection } from "@/components/AthleteSelection";
import { TrainingSession } from "@/components/TrainingSession";

const Index = () => {
  const [selectedAthletes, setSelectedAthletes] = useState<string[] | null>(null);

  const handleStartTraining = (athletes: string[]) => {
    setSelectedAthletes(athletes);
  };

  const handleBack = () => {
    setSelectedAthletes(null);
  };

  return (
    <>
      {!selectedAthletes ? (
        <AthleteSelection onStartTraining={handleStartTraining} />
      ) : (
        <TrainingSession athleteNames={selectedAthletes} onBack={handleBack} />
      )}
    </>
  );
};

export default Index;
