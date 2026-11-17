import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AvailabilityService } from "./availability.service";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { DispatchService } from "./dispatch.service";

@Module({
  imports: [AuthModule],
  providers: [AvailabilityService, BookingsService, DispatchService],
  controllers: [BookingsController],
  exports: [AvailabilityService, BookingsService, DispatchService],
})
export class BookingsModule {}
