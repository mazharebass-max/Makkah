import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { SandboxService } from "./sandbox.service";

class NotifyDto {
  @IsString()
  to!: string;

  @IsString()
  message!: string;
}

class AmountCheckoutDto {
  @IsInt()
  @Min(1)
  amountHalalas!: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

@Controller()
export class SandboxController {
  constructor(@Inject(SandboxService) private readonly sandbox: SandboxService) {}

  /** Amount-only smoke helper — booking-linked checkout is POST /payments/checkout */
  @UseGuards(AuthGuard)
  @Post("sandbox/payments/checkout")
  amountCheckout(@Body() body: AmountCheckoutDto) {
    return this.sandbox.createPaymentCheckout(body.amountHalalas, body.currency ?? "SAR");
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

