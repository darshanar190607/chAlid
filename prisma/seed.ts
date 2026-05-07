import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const hospitals = [
    {
      name: "AIIMS New Delhi",
      address: "Ansari Nagar, New Delhi",
      lat: 28.5672,
      lng: 77.2100,
      phone: "011-26588500",
      type: "Govt",
      hasNicu: true,
      rating: 4.8
    },
    {
      name: "Safdarjung Hospital",
      address: "Safdarjung, New Delhi",
      lat: 28.5684,
      lng: 77.2078,
      phone: "011-26730000",
      type: "Govt",
      hasNicu: true,
      rating: 4.2
    },
    {
      name: "Apollo Hospital Indraprastha",
      address: "Sarita Vihar, New Delhi",
      lat: 28.5361,
      lng: 77.2847,
      phone: "1860-500-1066",
      type: "Private",
      hasNicu: true,
      rating: 4.7
    },
    {
      name: "Max Super Speciality Hospital",
      address: "Saket, New Delhi",
      lat: 28.5281,
      lng: 77.2119,
      phone: "011-26515050",
      type: "Private",
      hasNicu: true,
      rating: 4.6
    },
    {
      name: "Fortis Memorial Research Institute",
      address: "Sector 44, Gurgaon",
      lat: 28.4595,
      lng: 77.0726,
      phone: "0124-4962200",
      type: "Private",
      hasNicu: true,
      rating: 4.8
    },
    {
      name: "Christian Medical College (CMC)",
      address: "Vellore, Tamil Nadu",
      lat: 12.9231,
      lng: 79.1332,
      phone: "0416-2281000",
      type: "Private",
      hasNicu: true,
      rating: 4.9
    },
    {
      name: "KEM Hospital",
      address: "Parel, Mumbai",
      lat: 19.0035,
      lng: 72.8423,
      phone: "022-24107000",
      type: "Govt",
      hasNicu: true,
      rating: 4.3
    },
    {
      name: "Narayana Health City",
      address: "Bommasandra, Bangalore",
      lat: 12.8123,
      lng: 77.6942,
      phone: "080-71222222",
      type: "Private",
      hasNicu: true,
      rating: 4.7
    },
    {
      name: "G. Kuppuswamy Naidu Memorial Hospital (GKNM)",
      address: "Pappanaickenpalayam, Coimbatore",
      lat: 11.0183,
      lng: 76.9740,
      phone: "0422-2245000",
      type: "Private",
      hasNicu: true,
      rating: 4.6
    },
    {
      name: "PSG Hospitals",
      address: "Peelamedu, Coimbatore",
      lat: 11.0267,
      lng: 76.9961,
      phone: "0422-2570170",
      type: "Private",
      hasNicu: true,
      rating: 4.5
    },
    {
      name: "Coimbatore Medical College Hospital",
      address: "Trichy Road, Coimbatore",
      lat: 11.0017,
      lng: 76.9667,
      phone: "0422-2301393",
      type: "Govt",
      hasNicu: true,
      rating: 4.1
    },
    {
      name: "Kovai Medical Center and Hospital (KMCH)",
      address: "Avinashi Road, Coimbatore",
      lat: 11.0427,
      lng: 77.0350,
      phone: "0422-4323666",
      type: "Private",
      hasNicu: true,
      rating: 4.8
    },
    {
      name: "Sri Ramakrishna Hospital",
      address: "Sidhapudur, Coimbatore",
      lat: 11.0142,
      lng: 76.9742,
      phone: "0422-4500000",
      type: "Private",
      hasNicu: true,
      rating: 4.6
    },
    {
      name: "Lotus Eye Hospital & Institute (Pediatric Wing)",
      address: "Sitra, Coimbatore",
      lat: 11.0500,
      lng: 77.0420,
      phone: "0422-4229900",
      type: "Private",
      hasNicu: false,
      rating: 4.4
    },
    {
      name: "Ganga Hospital",
      address: "Mettupalayam Road, Coimbatore",
      lat: 11.0140,
      lng: 76.9540,
      phone: "0422-2485000",
      type: "Private",
      hasNicu: true,
      rating: 4.7
    },
    {
      name: "Royal Care Super Speciality Hospital",
      address: "Neelambur, Coimbatore",
      lat: 11.0740,
      lng: 77.0660,
      phone: "0422-2227000",
      type: "Private",
      hasNicu: true,
      rating: 4.8
    },
    {
      name: "Gem Hospital (Pediatric Specialty)",
      address: "Ramanathapuram, Coimbatore",
      lat: 10.9980,
      lng: 76.9850,
      phone: "0422-2324100",
      type: "Private",
      hasNicu: true,
      rating: 4.5
    },
    {
      name: "KG Hospital",
      address: "Arts College Road, Coimbatore",
      lat: 11.0020,
      lng: 76.9630,
      phone: "0422-2212121",
      type: "Private",
      hasNicu: true,
      rating: 4.6
    }
  ];

  console.log('Seeding hospitals...');

  for (const hospital of hospitals) {
    await prisma.hospital.upsert({
      where: { name: hospital.name }, // Assuming name is unique for seed
      update: hospital,
      create: hospital
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
