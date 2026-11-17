import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { RequestUser } from "./auth.types";

export type AuthedRequest = {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  user?: RequestUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    const bearer =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7)
        : undefined;
    const cookieToken = req.cookies?.hr_access;
    const token = bearer ?? cookieToken;
    if (!token) {
      throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    req.user = await this.auth.verifyAccessToken(token);
    return true;
  }
}
