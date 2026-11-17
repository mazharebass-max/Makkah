import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RoleCode } from "@haramain/contracts";
import { ROLES_KEY } from "./roles.decorator";
import type { AuthedRequest } from "./auth.guard";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Missing user" });
    }
    const ok = required.some((r) => user.roles.includes(r));
    if (!ok) {
      throw new ForbiddenException({
        code: "FORBIDDEN_ROLE",
        message: "Insufficient role",
        details: { required },
      });
    }
    return true;
  }
}
