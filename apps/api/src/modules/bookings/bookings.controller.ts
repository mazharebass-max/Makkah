import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { BookingsService } from "./bookings.service";
import { DispatchService } from "./dispatch.service";

class TransitionDto {
  @IsEnum(BookingStatus)
  toStatus!: BookingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class AssignDto {
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

class CancelDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class SandboxConfirmDto {
  @IsUUID()
  bookingId!: string;
}

@Controller()
export class BookingsController {
  constructor(
    @Inject(BookingsService) private readonly bookings: BookingsService,
    @Inject(DispatchService) private readonly dispatch: DispatchService,
  ) {}

  @UseGuards(AuthGuard)
  @Get("bookings/:id")
  getOne(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.bookings.getBooking(req.user!, id);
  }

  @UseGuards(AuthGuard)
  @Post("bookings/:id/transition")
  @UseGuards(RolesGuard)
  @Roles(
    RoleCode.SUPER_ADMIN,
    RoleCode.FLEET_DISPATCHER,
    RoleCode.SUPPORT_AGENT,
    RoleCode.DRIVER,
  )
  transition(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: TransitionDto) {
    return this.bookings.transition({
      user: req.user!,
      bookingId: id,
      toStatus: body.toStatus,
      note: body.note,
    });
  }

  @UseGuards(AuthGuard)
  @Post("bookings/:id/cancel")
  cancel(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: CancelDto) {
    return this.bookings.cancel(req.user!, id, body.note);
  }

  @UseGuards(AuthGuard)
  @Post("payments/sandbox/confirm")
  sandboxConfirm(@Req() req: AuthedRequest, @Body() body: SandboxConfirmDto) {
    if (!body?.bookingId) {
      throw new BadRequestException({
        code: "BOOKING_ID_REQUIRED",
        message: "bookingId is required",
      });
    }
    return this.bookings.confirmSandboxPayment(req.user!, body.bookingId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.FLEET_DISPATCHER, RoleCode.OWNED_FLEET_MANAGER)
  @Post("admin/bookings/:id/assign")
  assign(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: AssignDto) {
    return this.dispatch.assignBooking({
      bookingId: id,
      actorId: req.user!.id,
      vehicleId: body.vehicleId,
      driverId: body.driverId,
      reason: body.reason,
    });
  }
}
