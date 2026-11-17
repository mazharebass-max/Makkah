import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QuoteService } from "./quote.service";
import { QuotesController } from "./quotes.controller";

@Module({
  imports: [AuthModule],
  providers: [QuoteService],
  controllers: [QuotesController],
  exports: [QuoteService],
})
export class PricingModule {}
