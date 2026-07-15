import { prisma } from '../../shared/prisma'
import bcrypt from 'bcryptjs'
import { AppError } from '../../shared/errors'

export async function loginStaff(email: string, password: string) {
  const staff = await prisma.staff.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { branch: { select: { name: true } } }
  })

  if (!staff || !staff.isActive) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  }

  const valid = await bcrypt.compare(password, staff.pwHash)
  if (!valid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  }

  return {
    id:                staff.id,
    email:             staff.email,
    fullName:          staff.fullName,
    role:              staff.role,
    branchId:          staff.branchId,
    branchName:        staff.branch?.name ?? '',
    mustChangePassword: (staff as any).mustChangePassword ?? false,
  }
}

export async function getStaffById(id: string) {
  const staff = await prisma.staff.findUnique({
    where: { id },
    include: { branch: { select: { name: true } } }
  })
  if (!staff) return null
  return {
    id:                staff.id,
    email:             staff.email,
    fullName:          staff.fullName,
    role:              staff.role,
    branchId:          staff.branchId,
    branchName:        staff.branch?.name ?? '',
    mustChangePassword: (staff as any).mustChangePassword ?? false,
  }
}