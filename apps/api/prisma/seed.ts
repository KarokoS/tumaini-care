import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Tumaini database...')

  // 1. Create the branch
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-nanyuki' },
    update: {},
    create: {
      id: 'branch-nanyuki',
      name: 'Tumaini St. Thorlak — Nanyuki',
      location: 'Huruma Road, Near Huruma Hospital, Nanyuki',
      phone: '+254 797 496 129',
      email: 'info@tumainiautismcentre.adnyeri.org',
    },
  })
  console.log('✔ Branch created:', branch.name)

  // 2. Create staff accounts
  const pw = await bcrypt.hash('Tumaini@2026', 12)

  const staffList = [
    {
      fullName: 'Dr. Ciku Mwangi',
      email: 'ciku@tumaini.care',
      role: 'MANAGER' as const,
      specialty: null,
    },
    {
      fullName: 'Mercy Akoth',
      email: 'mercy@tumaini.care',
      role: 'THERAPIST' as const,
      specialty: 'OT' as const,
    },
    {
      fullName: 'Priscilla Kariuki',
      email: 'priscilla@tumaini.care',
      role: 'THERAPIST' as const,
      specialty: 'SPEECH' as const,
    },
    {
      fullName: 'James Otieno',
      email: 'james@tumaini.care',
      role: 'THERAPIST' as const,
      specialty: 'ABA' as const,
    },
    {
      fullName: 'Samuel Mwenda',
      email: 'samuel@tumaini.care',
      role: 'RECEPTIONIST' as const,
      specialty: null,
    },
  ]

  for (const s of staffList) {
    await prisma.staff.upsert({
      where: { email: s.email },
      update: {},
      create: {
        ...s,
        pwHash: pw,
        branchId: branch.id,
      },
    })
  }
  console.log('✔ Staff created (5 accounts)')

  // 3. Create clients
  const clientsData = [
    {
      fullName: 'Jayden Ochieng',
      dob: '2018-03-14',
      gender: 'Male',
      diagnosis: 'ASD Level 2',
      guardianName: 'Grace Ochieng',
      guardianPhone: '+254722000001',
    },
    {
      fullName: 'Amina Wanjiku',
      dob: '2021-07-22',
      gender: 'Female',
      diagnosis: 'ASD Level 1',
      guardianName: 'Mary Wanjiku',
      guardianPhone: '+254722000002',
    },
    {
      fullName: 'Brian Kamau',
      dob: '2017-01-09',
      gender: 'Male',
      diagnosis: 'ASD Level 2',
      guardianName: 'John Kamau',
      guardianPhone: '+254722000003',
    },
    {
      fullName: 'Sasha Njoroge',
      dob: '2020-04-05',
      gender: 'Female',
      diagnosis: 'ASD + SPD',
      guardianName: 'Anne Njoroge',
      guardianPhone: '+254722000004',
    },
    {
      fullName: 'Liam Odhiambo',
      dob: '2018-11-28',
      gender: 'Male',
      diagnosis: 'ASD Level 1',
      guardianName: 'Peter Odhiambo',
      guardianPhone: '+254722000005',
    },
  ]

  for (const c of clientsData) {
    const { guardianName, guardianPhone, dob, ...rest } = c
    await prisma.client.upsert({
      where: { id: c.fullName.toLowerCase().replace(/ /g, '-') },
      update: {},
      create: {
        id: c.fullName.toLowerCase().replace(/ /g, '-'),
        ...rest,
        dob: new Date(dob),
        branchId: branch.id,
        guardians: {
          create: {
            fullName: guardianName,
            relationship: 'Parent',
            phone: guardianPhone,
            isPrimary: true,
          },
        },
      },
    })
  }
  console.log('✔ Clients created (5 records)')

  console.log('\n✅ Seed complete!')
  console.log('\nLogin credentials:')
  console.log('  Manager:      ciku@tumaini.care     / Tumaini@2026')
  console.log('  Therapist:    mercy@tumaini.care    / Tumaini@2026')
  console.log('  Receptionist: samuel@tumaini.care   / Tumaini@2026')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())