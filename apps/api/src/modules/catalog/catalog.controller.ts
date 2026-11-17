import { Controller, Get, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Controller()
export class CatalogController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("routes")
  async routes() {
    const routes = await this.prisma.route.findMany({
      where: { active: true },
      include: { fromZone: true, toZone: true },
      orderBy: { code: "asc" },
    });
    return {
      data: routes.map((r) => ({
        id: r.id,
        code: r.code,
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        from: { code: r.fromZone.code, nameEn: r.fromZone.nameEn },
        to: { code: r.toZone.code, nameEn: r.toZone.nameEn },
        draftLabel: r.draftLabel,
      })),
    };
  }

  @Get("vehicle-categories")
  async categories() {
    const cats = await this.prisma.vehicleCategory.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
    });
    return {
      data: cats.map((c) => ({
        id: c.id,
        code: c.code,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        passengerCap: c.passengerCap,
        luggageCap: c.luggageCap,
        draftLabel: c.draftLabel,
      })),
    };
  }
}
