import { prisma } from '../../shared/prisma'
import { NotFoundError } from '../../shared/errors'
export async function getAllClients(branchId: string, query?: string) {
  return prisma.client.findMany({ where: { branchId, ...(query && { fullName: { contains: query, mode: 'insensitive' } }) }, include: { guardians: { where: { isPrimary: true } }, _count: { select: { appointments: true, itps: true } } }, orderBy: { fullName: 'asc' } })
}
export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({ where: { id }, include: { guardians: true, itps: { include: { goals: true }, where: { status: 'ACTIVE' } }, appointments: { orderBy: { scheduledAt: 'desc' }, take: 10, include: { therapist: { select: { fullName: true } } } }, documents: { orderBy: { uploadedAt: 'desc' } } } })
  if (!client) throw new NotFoundError('Client')
  return client
}
export async function createClient(data: { fullName: string; dob: string; gender: string; diagnosis?: string; coOccurring?: string; allergies?: string; referralSrc?: string; schoolName?: string; branchId: string; guardian: { fullName: string; relationship: string; phone: string; email?: string } }) {
  const { guardian, ...clientData } = data
  return prisma.client.create({ data: { ...clientData, dob: new Date(clientData.dob), guardians: { create: { ...guardian, isPrimary: true } } }, include: { guardians: true } })
}
export async function updateClient(id: string, data: Partial<{
  fullName: string; diagnosis: string; coOccurring: string;
  allergies: string; status: string; schoolName: string;
  isProBono: boolean; proBonoReason: string; referralSrc: string;
}>) {
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Client')
  return prisma.client.update({ where: { id }, data })
}
export async function getClientTimeline(clientId: string) {
  const [appointments, progressLogs, invoices] = await Promise.all([
    prisma.appointment.findMany({ where: { clientId }, orderBy: { scheduledAt: 'desc' }, take: 20, include: { therapist: { select: { fullName: true } }, sessionNote: { select: { id: true, isLocked: true } } } }),
    prisma.goalProgressLog.findMany({ where: { goal: { itp: { clientId } } }, orderBy: { loggedAt: 'desc' }, take: 20, include: { goal: { select: { title: true } } } }),
    prisma.invoice.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 10 })
  ])
  return { appointments, progressLogs, invoices }
}
