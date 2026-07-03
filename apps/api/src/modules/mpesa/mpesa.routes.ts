import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

const MPESA_BASE = process.env.MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke"

async function getAccessToken(): Promise<string> {
  const key    = process.env.MPESA_CONSUMER_KEY!
  const secret = process.env.MPESA_CONSUMER_SECRET!
  const auth   = Buffer.from(`${key}:${secret}`).toString("base64")

  const res = await fetch(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  )
  const data = await res.json() as { access_token: string }
  return data.access_token
}

function getTimestamp(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("")
}

function getPassword(timestamp: string): string {
  const shortcode = process.env.MPESA_SHORTCODE!
  const passkey   = process.env.MPESA_PASSKEY!
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64")
}

export async function mpesaRoutes(fastify: FastifyInstance) {

  // ── Initiate STK Push ──
  fastify.post("/mpesa/stkpush", {
    preHandler: requireRole("SUPER_ADMIN", "MANAGER", "FINANCE", "RECEPTIONIST")
  }, async (request, reply) => {
    const { invoiceId, phone } = request.body as { invoiceId: string; phone: string }

    // Format and validate phone
    const formattedPhone = phone
      .replace(/\s+/g, "")
      .replace(/^0/, "254")
      .replace(/^\+/, "")

    if (!/^254[71]\d{8}$/.test(formattedPhone)) {
      return reply.status(400).send({
        message: "Invalid phone number. Use format 07XX XXX XXX or 254XXXXXXXXX"
      })
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: { select: { fullName: true } } }
    })
    if (!invoice) return reply.status(404).send({ message: "Invoice not found" })
    if (invoice.status === "PAID") return reply.status(400).send({ message: "Invoice already paid" })

    try {
      const token     = await getAccessToken()
      const timestamp = getTimestamp()
      const password  = getPassword(timestamp)
      const amount    = Math.ceil(parseFloat(invoice.amountKes.toString()))

      const stkRes = await fetch(`${MPESA_BASE}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password:          password,
          Timestamp:         timestamp,
          TransactionType:   "CustomerPayBillOnline",
          Amount:            amount,
          PartyA:            formattedPhone,
          PartyB:            process.env.MPESA_SHORTCODE,
          PhoneNumber:       formattedPhone,
          CallBackURL:       process.env.MPESA_CALLBACK_URL,
          AccountReference:  invoice.number,
          TransactionDesc:   `Payment for ${invoice.client?.fullName ?? "client"} - ${invoice.number}`,
        }),
      })

      const stkData = await stkRes.json() as {
        ResponseCode?: string
        CheckoutRequestID?: string
        errorMessage?: string
        ResultDesc?: string
      }

      fastify.log.info({ stkData }, "Daraja STK response")

      if (stkData.ResponseCode === "0" && stkData.CheckoutRequestID) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data:  { mpesaCheckoutId: stkData.CheckoutRequestID }
        })
        return reply.send({
          success:           true,
          checkoutRequestId: stkData.CheckoutRequestID,
          message:           "STK push sent. Ask the customer to check their phone."
        })
      } else {
        return reply.status(400).send({
          message: stkData.errorMessage ?? stkData.ResultDesc ?? "STK Push failed"
        })
      }
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ message: "Could not connect to M-Pesa. Check your credentials." })
    }
  })

  // ── Callback from Safaricom ──
  // This endpoint must be public — no auth guard
  fastify.post("/mpesa/callback", async (request, reply) => {
    const body = request.body as any
    const stk  = body?.Body?.stkCallback

    if (!stk) return reply.send({ ResultCode: 0, ResultDesc: "Accepted" })

    const checkoutRequestId = stk.CheckoutRequestID as string
    const resultCode        = stk.ResultCode as number

    if (resultCode === 0) {
      const metaItems = stk.CallbackMetadata?.Item ?? []
      const getValue  = (name: string) =>
        metaItems.find((i: any) => i.Name === name)?.Value as string | undefined

      const mpesaRef = getValue("MpesaReceiptNumber")
      const amount   = getValue("Amount")
      const phone    = getValue("PhoneNumber")

      await prisma.invoice.updateMany({
        where: { mpesaCheckoutId: checkoutRequestId },
        data: {
          status:    "PAID",
          paidAt:    new Date(),
          mpesaRef:  mpesaRef ?? null,
        }
      })

      fastify.log.info(
        `✓ M-Pesa confirmed: ${mpesaRef} · KSh ${amount} · from ${phone}`
      )
    } else {
      fastify.log.warn(
        `✗ M-Pesa STK failed/cancelled · CheckoutRequestID: ${checkoutRequestId}`
      )
    }

    return reply.send({ ResultCode: 0, ResultDesc: "Accepted" })
  })

  // ── Query payment status ──
  fastify.get("/mpesa/status/:checkoutRequestId", {
    preHandler: requireRole("SUPER_ADMIN", "MANAGER", "FINANCE", "RECEPTIONIST")
  }, async (request, reply) => {
    const { checkoutRequestId } = request.params as { checkoutRequestId: string }

    // First check our own DB — fastest and works even if Daraja is slow
    const invoice = await prisma.invoice.findFirst({
      where: { mpesaCheckoutId: checkoutRequestId }
    })
    if (invoice?.status === "PAID") {
      return reply.send({ paid: true, resultCode: "0", resultDesc: "The service request is processed successfully." })
    }

    // Then query Daraja
    try {
      const token     = await getAccessToken()
      const timestamp = getTimestamp()
      const password  = getPassword(timestamp)

      const res = await fetch(`${MPESA_BASE}/mpesa/stkpushquery/v1/query`, {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password:          password,
          Timestamp:         timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      })

      const data = await res.json() as { ResultCode?: string; ResultDesc?: string }
      const paid  = data.ResultCode === "0"

      // If Daraja confirms paid but callback hadn't arrived yet, update now
      if (paid && invoice) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data:  { status: "PAID", paidAt: new Date() }
        })
      }

      return reply.send({
        paid,
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
      })
    } catch (err) {
      fastify.log.error(err)
      return reply.status(500).send({ message: "Status check failed" })
    }
  })
}