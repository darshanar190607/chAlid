import { prisma } from "@/lib/prisma";
import { addDays, addWeeks, addMonths } from "date-fns";

export async function generateVaccineSchedule(babyId: string, dob: Date) {
  const schedule = [
    { name: "BCG", ageType: "birth", offset: 0 },
    { name: "OPV 0", ageType: "birth", offset: 0 },
    { name: "Hepatitis B (Birth dose)", ageType: "birth", offset: 0 },
    { name: "OPV 1", ageType: "weeks", offset: 6 },
    { name: "Pentavalent 1", ageType: "weeks", offset: 6 },
    { name: "Rotavirus 1", ageType: "weeks", offset: 6 },
    { name: "PCV 1", ageType: "weeks", offset: 6 },
    { name: "OPV 2", ageType: "weeks", offset: 10 },
    { name: "Pentavalent 2", ageType: "weeks", offset: 10 },
    { name: "Rotavirus 2", ageType: "weeks", offset: 10 },
    { name: "PCV 2", ageType: "weeks", offset: 10 },
    { name: "OPV 3", ageType: "weeks", offset: 14 },
    { name: "Pentavalent 3", ageType: "weeks", offset: 14 },
    { name: "Rotavirus 3", ageType: "weeks", offset: 14 },
    { name: "PCV 3", ageType: "weeks", offset: 14 },
    { name: "IPV", ageType: "weeks", offset: 14 },
    { name: "Measles 1", ageType: "months", offset: 9 },
    { name: "Vitamin A (1st dose)", ageType: "months", offset: 9 },
    { name: "MMR 1", ageType: "months", offset: 12 },
    { name: "Typhoid", ageType: "months", offset: 12 },
    { name: "Hepatitis A (1st dose)", ageType: "months", offset: 12 },
    { name: "PCV Booster", ageType: "months", offset: 15 },
    { name: "MMR 2", ageType: "months", offset: 18 },
    { name: "Varicella 1", ageType: "months", offset: 18 },
    { name: "DPT Booster 1", ageType: "months", offset: 18 },
    { name: "OPV Booster", ageType: "months", offset: 18 }
  ];

  const vaccineRecords = schedule.map(v => {
    let scheduledDate: Date;
    
    if (v.ageType === "birth") {
      scheduledDate = dob;
    } else if (v.ageType === "weeks") {
      scheduledDate = addWeeks(dob, v.offset);
    } else {
      scheduledDate = addMonths(dob, v.offset);
    }
    
    return {
      babyId,
      vaccineName: v.name,
      scheduledDate,
      status: "pending"
    };
  });

  return await prisma.vaccineRecord.createMany({ data: vaccineRecords });
}
