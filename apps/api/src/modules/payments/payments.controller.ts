import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PaymentsService } from "./payments.service";

class CheckoutDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  idempotencyKey?: string;
}

class SandboxCompleteDto {
  @IsUUID()
  bookingId!: string;
}

class RefundDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountHalalas?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

class WebhookDto {
  @IsString()
  @MinLength(4)
  gatewayEventId!: string;

  @IsString()
  type!: string;

  @IsString()
  sandboxRef!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountHalalas?: number;
}

@Controller()
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @UseGuards(AuthGuard)
  @Post("payments/checkout")
  checkout(@Req() req: AuthedRequest, @Body() body: CheckoutDto) {
    return this.payments.createCheckout(req.user!, body);
  }

  /** Browser-safe sandbox completion — ledger path without client webhook secrets. */
  @UseGuards(AuthGuard)
  @Post("payments/sandbox/complete")
  sandboxComplete(@Req() req: AuthedRequest, @Body() body: SandboxCompleteDto) {
    return this.payments.completeSandboxCheckout(req.user!, body);
  }

  @Post("webhooks/payments/:provider")
  async webhook(
    @Param("provider") provider: string,
    @Req() req: AuthedRequest & { rawBody?: Buffer },
    @Headers("x-haramain-signature") signature: string | undefined,
    @Body() body: WebhookDto,
  ) {
    if (provider !== "sandbox") {
      return {
        ok: false,
        mode: "sandbox",
        message: `Only sandbox provider enabled (got ${provider}) — no live PSP`,
      };
    }
    // Prefer Nest rawBody when enabled; tests may pass reconstructed JSON
    const raw = (req as { rawBody?: Buffer }).rawBody?.toString("utf8");
    if (raw) {
      this.payments.verifyWebhookSignature(raw, signature);
    } else {
      this.payments.verifyWebhookSignature(JSON.stringify(body), signature);
    }
    return this.payments.handleWebhook(body);
  }

  @UseGuards(AuthGuard)
  @Post("payments/refunds")
  refund(@Req() req: AuthedRequest, @Body() body: RefundDto) {
    return this.payments.requestRefund(req.user!, body);
  }

  @UseGuards(AuthGuard)
  @Get("invoices/:id")
  invoice(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.payments.getInvoice(req.user!, id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.FINANCE_OFFICER, RoleCode.SUPER_ADMIN)
  @Get("admin/finance/reconciliation")
  reconciliation() {
    return this.payments.reconciliation();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.FINANCE_OFFICER, RoleCode.SUPER_ADMIN)
  @Get("admin/finance/invoices")
  invoices() {
    return this.payments.listInvoices();
  }
}
