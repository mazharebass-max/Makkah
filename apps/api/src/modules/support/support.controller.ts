import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SupportTicketStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SupportService } from "./support.service";

class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}

class MessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

class StatusDto {
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;
}

@Controller()
export class SupportController {
  constructor(@Inject(SupportService) private readonly support: SupportService) {}

  @UseGuards(AuthGuard)
  @Post("support/tickets")
  create(@Req() req: AuthedRequest, @Body() body: CreateTicketDto) {
    return this.support.createTicket(req.user!, body);
  }

  @UseGuards(AuthGuard)
  @Get("support/tickets")
  list(@Req() req: AuthedRequest) {
    return this.support.listMine(req.user!);
  }

  @UseGuards(AuthGuard)
  @Get("support/tickets/:id")
  get(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.support.getTicket(req.user!, id);
  }

  @UseGuards(AuthGuard)
  @Post("support/tickets/:id/messages")
  message(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: MessageDto) {
    return this.support.addMessage(req.user!, id, body.body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPPORT_AGENT, RoleCode.SUPER_ADMIN)
  @Patch("admin/support/tickets/:id/status")
  status(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: StatusDto) {
    return this.support.setStatus(req.user!, id, body.status);
  }
}
