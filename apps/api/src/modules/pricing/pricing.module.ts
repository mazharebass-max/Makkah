import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BookingsModule } from "../bookings/bookings.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { QuoteService } from "./quote.service";
import { QuotesController } from "./quotes.controller";

@Module({
  imports: [AuthModule, forwardRef(() => BookingsModule), NotificationsModule],
  providers: [QuoteService],
  controllers: [QuotesController],
  exports: [QuoteService],
})
export class PricingModule {}

