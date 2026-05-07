export const VACCINE_METADATA: Record<string, { description: string; ageDue: string }> = {
  "BCG": { description: "Tuberculosis protection", ageDue: "At birth" },
  "OPV 0": { description: "Polio (oral)", ageDue: "At birth" },
  "Hepatitis B (Birth dose)": { description: "Hepatitis B protection", ageDue: "At birth" },
  "OPV 1": { description: "Polio (oral) - 1st dose", ageDue: "6 weeks" },
  "Pentavalent 1": { description: "DPT + Hep B + Hib", ageDue: "6 weeks" },
  "Rotavirus 1": { description: "Rotavirus protection", ageDue: "6 weeks" },
  "PCV 1": { description: "Pneumococcal - 1st dose", ageDue: "6 weeks" },
  "OPV 2": { description: "Polio (oral) - 2nd dose", ageDue: "10 weeks" },
  "Pentavalent 2": { description: "DPT + Hep B + Hib", ageDue: "10 weeks" },
  "Rotavirus 2": { description: "Rotavirus - 2nd dose", ageDue: "10 weeks" },
  "PCV 2": { description: "Pneumococcal - 2nd dose", ageDue: "10 weeks" },
  "OPV 3": { description: "Polio (oral) - 3rd dose", ageDue: "14 weeks" },
  "Pentavalent 3": { description: "DPT + Hep B + Hib", ageDue: "14 weeks" },
  "Rotavirus 3": { description: "Rotavirus - 3rd dose", ageDue: "14 weeks" },
  "PCV 3": { description: "Pneumococcal - 3rd dose", ageDue: "14 weeks" },
  "IPV": { description: "Inactivated Polio Vaccine", ageDue: "14 weeks" },
  "Measles 1": { description: "Measles protection", ageDue: "9 months" },
  "Vitamin A (1st dose)": { description: "Vitamin A supplementation", ageDue: "9 months" },
  "MMR 1": { description: "Measles, Mumps, Rubella", ageDue: "12 months" },
  "Typhoid": { description: "Typhoid fever protection", ageDue: "12 months" },
  "Hepatitis A (1st dose)": { description: "Hepatitis A protection", ageDue: "12 months" },
  "PCV Booster": { description: "Pneumococcal booster", ageDue: "15 months" },
  "MMR 2": { description: "MMR booster dose", ageDue: "18 months" },
  "Varicella 1": { description: "Chickenpox protection", ageDue: "18 months" },
  "DPT Booster 1": { description: "DPT booster dose", ageDue: "18 months" },
  "OPV Booster": { description: "Polio booster dose", ageDue: "18 months" }
};

export function getVaccineMetadata(vaccineName: string) {
  return VACCINE_METADATA[vaccineName] || { description: "", ageDue: "" };
}
