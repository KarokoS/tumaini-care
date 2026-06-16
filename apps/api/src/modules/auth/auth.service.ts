import bcrypt from 'bcryptjs'
import { prisma } from '../../shared/prisma'
import { UnauthorizedError } from '../../shared/errors'
export async function loginStaff(email: string, password: string) {
  const staff = await prisma.staff.findUnique({ where: { email: email.toLowerCase().trim() }, include: { branch: true } })
  if (!staff || !staff.isActive) throw new UnauthorizedError('Invalid email or password')
  const passwordValid = await bcrypt.compare(password, staff.pwHash)
  if (!passwordValid) throw new UnauthorizedError('Invalid email or password')
  return { id: staff.id, email: staff.email, fullName: staff.fullName, role: staff.role, specialty: staff.specialty, branchId: staff.branchId, branchName: staff.branch.name }
}
export async function hashPassword(password: string): Promise<string> { return bcrypt.hash(password, 12) }
export async function getStaffById(id: string) {
  return prisma.staff.findUnique({ where: { id }, select: { id: true, email: true, fullName: true, role: true, specialty: true, branchId: true, isActive: true } })
}
