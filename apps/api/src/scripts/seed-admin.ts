import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding production database...")

  // Create branch
  let branch = await prisma.branch.findFirst({
    where: { name: "Tumaini St. Thorlak Autism Centre" }
  })

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name:     "Tumaini St. Thorlak Autism Centre",
        location: "Nanyuki, Laikipia, Kenya",
        phone:    "+254 000 000 000",
        email:    "info@tumaini.ke",
        isActive: true,
      }
    })
    console.log("✓ Branch created:", branch.name)
  } else {
    console.log("✓ Branch already exists:", branch.name)
  }

  // Create super admin
  const existingAdmin = await prisma.staff.findUnique({
    where: { email: "admin@tumaini.ke" }
  })

  if (!existingAdmin) {
    const pwHash = await bcrypt.hash("Tumaini@2025!", 12)
    const admin = await prisma.staff.create({
      data: {
        fullName: "System Administrator",
        email:    "admin@tumaini.ke",
        role:     "SUPER_ADMIN",
        pwHash,
        isActive: true,
        branchId: branch.id,
      }
    })
    console.log("✓ Super admin created:", admin.email)
    console.log("  Password: Tumaini@2025!")
  } else {
    console.log("✓ Admin already exists:", existingAdmin.email)
  }

  console.log("\n✅ Seed complete. You can now log in at app.tumaini.ke")
  console.log("   Email:    admin@tumaini.ke")
  console.log("   Password: Tumaini@2025!")
}

main()
  .catch(e => { console.error("Seed failed:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())