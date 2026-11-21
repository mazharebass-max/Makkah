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
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
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

class LocationRoleDto {
  @IsOptional()
  @IsString()
  role?: "DRIVER" | "CUSTOMER";
}

class LocationDto extends LocationRoleDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyM?: number;
}

@Controller()
export class BookingsController {
  constructor(
    @Inject(BookingsService) private readonly bookings: BookingsService,
    @Inject(DispatchService) private readonly dispatch: DispatchService,
  ) {}

  @UseGuards(AuthGuard)
  @Get("bookings")
  listMine(@Req() req: AuthedRequest) {
    return this.bookings.listMine(req.user!);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.DRIVER)
  @Get("driver/trips")
  driverTrips(@Req() req: AuthedRequest) {
    return this.bookings.listDriverTrips(req.user!);
  }

  @UseGuards(AuthGuard)
  @Get("bookings/:id")
  getOne(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.bookings.getBooking(req.user!, id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.DRIVER, RoleCode.CUSTOMER)
  @Post("bookings/:id/location/consent")
  grantConsent(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: LocationRoleDto,
  ) {
    return this.bookings.grantLocationConsent(req.user!, id, body?.role);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.DRIVER, RoleCode.CUSTOMER)
  @Post("bookings/:id/location/revoke")
  revokeConsent(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: LocationRoleDto,
  ) {
    return this.bookings.revokeLocationConsent(req.user!, id, body?.role);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.DRIVER, RoleCode.CUSTOMER)
  @Post("bookings/:id/location")
  postLocation(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: LocationDto) {
    return this.bookings.postLocationSample(req.user!, id, body);
  }

  @UseGuards(AuthGuard)
  @Get("bookings/:id/location")
  latestLocation(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.bookings.latestLocation(req.user!, id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    RoleCode.SUPER_ADMIN,
    RoleCode.FLEET_DISPATCHER,
    RoleCode.SUPPORT_AGENT,
    RoleCode.DRIVER,
  )
  @Post("bookings/:id/transition")
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
