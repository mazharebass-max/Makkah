import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  Equals,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { QuoteService } from "./quote.service";

class SearchQueryDto {
  @IsString()
  @MinLength(2)
  routeCode!: string;

  @IsISO8601()
  scheduledAt!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(20)
  passengers!: number;

  @Transform(({ value }) => (value === undefined || value === "" ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  @Max(40)
  luggage = 0;
}

class CreateQuoteDto {
  @IsString()
  @MinLength(2)
  routeCode!: string;

  @IsString()
  @MinLength(2)
  categoryCode!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  passengers!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  luggage?: number;
}

class CreateBookingDto {
  @IsUUID()
  quoteId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  contactName!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(32)
  contactPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialInstructions?: string;

  @Equals(true)
  acceptTerms!: true;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey?: string;
}

@Controller()
export class QuotesController {
  constructor(@Inject(QuoteService) private readonly quotes: QuoteService) {}

  @Get("search")
  search(@Query() query: SearchQueryDto) {
    return this.quotes.search(query);
  }

  @Post("quotes")
  createQuote(@Body() body: CreateQuoteDto) {
    return this.quotes.createQuote({
      ...body,
      luggage: body.luggage ?? 0,
    });
  }

  @Get("quotes/:id")
  getQuote(@Param("id") id: string) {
    return this.quotes.getQuote(id);
  }

  @UseGuards(AuthGuard)
  @Post("bookings")
  async createBooking(@Req() req: AuthedRequest, @Body() body: CreateBookingDto) {
    if (body.acceptTerms !== true) {
      throw new BadRequestException({
        code: "TERMS_REQUIRED",
        message: "Terms must be accepted",
      });
    }
    return this.quotes.createBooking(req.user!.id, body);
  }
}
