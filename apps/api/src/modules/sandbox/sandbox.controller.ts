import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { SandboxService } from "./sandbox.service";

class CheckoutDto {
  @IsInt()
  @Min(1)
  amountHalalas!: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

class NotifyDto {
  @IsString()
  to!: string;

  @IsString()
  message!: string;
}

@Controller()
export class SandboxController {
  constructor(@Inject(SandboxService) private readonly sandbox: SandboxService) {}

  @UseGuards(AuthGuard)
  @Post("payments/checkout")
  checkout(@Body() body: CheckoutDto) {
    return this.sandbox.createPaymentCheckout(body.amountHalalas, body.currency ?? "SAR");
  }

  @Post("webhooks/payments/:provider")
  webhook() {
    return {
      ok: true,
      mode: "sandbox",
      message: "Webhook accepted in sandbox mode — no live settlement",
    };
  }

  @UseGuards(AuthGuard)
  @Post("sandbox/sms")
  sms(@Body() body: NotifyDto) {
    return this.sandbox.sendSms(body.to, body.message);
  }

  @UseGuards(AuthGuard)
  @Post("sandbox/email")
  email(@Body() body: NotifyDto & { subject?: string }) {
    return this.sandbox.sendEmail(body.to, body.subject ?? body.message);
  }
}
