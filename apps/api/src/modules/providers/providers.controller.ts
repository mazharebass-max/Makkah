import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ProvidersService } from "./providers.service";

class ApplyDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  legalName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  registrationNo?: string;
}

class DocumentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  docType!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  storageKey!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

class DriverDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneE164?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  licenceStorageKey?: string;

  @IsOptional()
  @IsString()
  licenceExpiresAt?: string;
}

@Controller("providers")
export class ProvidersController {
  constructor(@Inject(ProvidersService) private readonly providers: ProvidersService) {}

  @Post("applications")
  apply(@Body() body: ApplyDto) {
    return this.providers.apply(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    RoleCode.PROVIDER_APPLICANT,
    RoleCode.PROVIDER_ADMIN,
    RoleCode.PROVIDER_DISPATCHER,
  )
  @Get("me")
  me(@Req() req: AuthedRequest) {
    return this.providers.getMine(req.user!);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.PROVIDER_APPLICANT, RoleCode.PROVIDER_ADMIN)
  @Post("me/documents")
  addDoc(@Req() req: AuthedRequest, @Body() body: DocumentDto) {
    return this.providers.addDocument(req.user!, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    RoleCode.PROVIDER_APPLICANT,
    RoleCode.PROVIDER_ADMIN,
    RoleCode.PROVIDER_DISPATCHER,
  )
  @Get("me/drivers")
  drivers(@Req() req: AuthedRequest) {
    return this.providers.listDrivers(req.user!);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.PROVIDER_ADMIN, RoleCode.PROVIDER_APPLICANT)
  @Post("me/drivers")
  addDriver(@Req() req: AuthedRequest, @Body() body: DriverDto) {
    return this.providers.addDriver(req.user!, body);
  }

  @UseGuards(AuthGuard)
  @Get("documents/:id")
  getDoc(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.providers.getDocument(req.user!, id);
  }
}
