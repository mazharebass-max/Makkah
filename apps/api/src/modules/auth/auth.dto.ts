import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsIn(["en", "ar", "ur"])
  locale?: "en" | "ar" | "ur";
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}

export class OtpRequestDto {
  @IsEmail()
  email!: string;
}

export class OtpVerifyDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class MfaTotpCodeDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class MfaLoginVerifyDto {
  @IsString()
  @MinLength(20)
  mfaToken!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
