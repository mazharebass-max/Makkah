import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { SandboxResult } from "@haramain/contracts";

@Injectable()
export class SandboxService {
  sendSms(to: string, body: string): SandboxResult {
    return {
      ok: true,
      mode: "sandbox",
      message: `SMS not sent (sandbox). Would deliver to ${to}: ${body.slice(0, 40)}…`,
      reference: `sms_sandbox_${randomUUID()}`,
    };
  }

  sendEmail(to: string, subject: string): SandboxResult {
    return {
      ok: true,
      mode: "sandbox",
      message: `Email not sent (sandbox). Would email ${to} subject="${subject}"`,
      reference: `email_sandbox_${randomUUID()}`,
    };
  }

  createPaymentCheckout(amountHalalas: number, currency = "SAR"): SandboxResult & { amountHalalas: number; currency: string } {
    return {
      ok: true,
      mode: "sandbox",
      message: "Payment checkout created in sandbox only — not a live capture",
      reference: `pay_sandbox_${randomUUID()}`,
      amountHalalas,
      currency,
    };
  }
}
