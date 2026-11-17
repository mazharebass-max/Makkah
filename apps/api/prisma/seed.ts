import { PrismaClient, FleetOwnership, ProviderStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { RoleCode } from "@haramain/contracts";

const prisma = new PrismaClient();

const DRAFT = "DRAFT — OWNER APPROVAL REQUIRED";

const ROLES: { code: string; name: string; description: string }[] = [
  { code: RoleCode.CUSTOMER, name: "Customer", description: "Book and manage trips" },
  { code: RoleCode.FLEET_DISPATCHER, name: "Fleet dispatcher", description: "Assign trips" },
  { code: RoleCode.OWNED_FLEET_MANAGER, name: "Owned fleet manager", description: "Manage owned fleet" },
  { code: RoleCode.PROVIDER_APPLICANT, name: "Provider applicant", description: "Apply to join" },
  { code: RoleCode.PROVIDER_ADMIN, name: "Provider admin", description: "Manage provider fleet" },
  { code: RoleCode.PROVIDER_DISPATCHER, name: "Provider dispatcher", description: "Provider assignments" },
  { code: RoleCode.DRIVER, name: "Driver", description: "Execute trips" },
  { code: RoleCode.FINANCE_OFFICER, name: "Finance officer", description: "Payments & settlements" },
  { code: RoleCode.COMPLIANCE_OFFICER, name: "Compliance officer", description: "Verify documents" },
  { code: RoleCode.SUPPORT_AGENT, name: "Support agent", description: "Customer support" },
  { code: RoleCode.SUPER_ADMIN, name: "Super admin", description: "Platform configuration" },
];

const PERMISSIONS = [
  "admin.bookings.read",
  "admin.bookings.assign",
  "admin.providers.review",
  "admin.finance.read",
  "catalog.read",
  "bookings.own",
  "driver.trips.own",
];

async function upsertUser(email: string, password: string, roleCode: string, locale = "en") {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, locale },
    create: {
      email,
      passwordHash,
      locale,
      identities: { create: { provider: "email", subject: email, verifiedAt: new Date() } },
      customerProfile: roleCode === RoleCode.CUSTOMER ? { create: { displayName: email.split("@")[0] } } : undefined,
      roleAssignments: { create: { roleId: role.id } },
    },
  });

  const hasRole = await prisma.roleAssignment.findFirst({
    where: { userId: user.id, roleId: role.id, revokedAt: null },
  });
  if (!hasRole) {
    await prisma.roleAssignment.create({ data: { userId: user.id, roleId: role.id } });
  }
  return user;
}

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p },
      update: {},
      create: { code: p, description: p },
    });
  }

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  const allPerms = await prisma.permission.findMany();
  const superAdmin = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUPER_ADMIN } });
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdmin.id, permissionId: perm.id },
    });
  }

  // Synthetic zones & routes — DRAFT
  const jed = await prisma.serviceZone.upsert({
    where: { code: "JED_AIRPORT" },
    update: {},
    create: { code: "JED_AIRPORT", nameEn: "Jeddah Airport (JED)", nameAr: "مطار جدة" },
  });
  const makkah = await prisma.serviceZone.upsert({
    where: { code: "MAKKAH_HOTELS" },
    update: {},
    create: { code: "MAKKAH_HOTELS", nameEn: "Makkah hotel zones", nameAr: "فنادق مكة" },
  });
  const madinah = await prisma.serviceZone.upsert({
    where: { code: "MADINAH_HOTELS" },
    update: {},
    create: { code: "MADINAH_HOTELS", nameEn: "Madinah hotel zones", nameAr: "فنادق المدينة" },
  });

  await prisma.route.upsert({
    where: { code: "JED-MAKKAH" },
    update: { draftLabel: DRAFT },
    create: {
      code: "JED-MAKKAH",
      nameEn: "JED Airport ↔ Makkah hotels",
      nameAr: "مطار جدة ↔ فنادق مكة",
      fromZoneId: jed.id,
      toZoneId: makkah.id,
      draftLabel: DRAFT,
    },
  });
  await prisma.route.upsert({
    where: { code: "MAKKAH-MADINAH" },
    update: { draftLabel: DRAFT },
    create: {
      code: "MAKKAH-MADINAH",
      nameEn: "Makkah ↔ Madinah",
      nameAr: "مكة ↔ المدينة",
      fromZoneId: makkah.id,
      toZoneId: madinah.id,
      draftLabel: DRAFT,
    },
  });

  const sedan = await prisma.vehicleCategory.upsert({
    where: { code: "SEDAN" },
    update: { draftLabel: DRAFT },
    create: {
      code: "SEDAN",
      nameEn: "Sedan",
      nameAr: "سيدان",
      passengerCap: 3,
      luggageCap: 3,
      draftLabel: DRAFT,
    },
  });
  await prisma.vehicleCategory.upsert({
    where: { code: "VAN" },
    update: { draftLabel: DRAFT },
    create: {
      code: "VAN",
      nameEn: "Van",
      nameAr: "فان",
      passengerCap: 7,
      luggageCap: 7,
      draftLabel: DRAFT,
    },
  });

  const pricing = await prisma.pricingRule.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: { draftLabel: DRAFT },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      categoryId: sedan.id,
      name: "Draft sedan base — owner approval required",
      draftLabel: DRAFT,
      versions: {
        create: { version: 1, baseHalalas: 25_000, currency: "SAR" },
      },
    },
  });
  void pricing;

  // Owned fleet vehicle (synthetic) — not a live availability claim
  await prisma.vehicle.upsert({
    where: { id: "00000000-0000-4000-8000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000010",
      ownership: FleetOwnership.OWNED,
      categoryId: sedan.id,
      plateNumber: "SYN-001",
      makeModel: "Synthetic Sedan",
      modelYear: 2024,
      passengerCap: 3,
      luggageCap: 3,
      availabilityNote: "Synthetic seed inventory — not live availability",
    },
  });

  // Third-party provider in APPLIED state only — no fake verified licence
  await prisma.provider.upsert({
    where: { id: "00000000-0000-4000-8000-000000000020" },
    update: { status: ProviderStatus.APPLIED, notes: DRAFT },
    create: {
      id: "00000000-0000-4000-8000-000000000020",
      legalName: "Synthetic Transport Co. (DRAFT)",
      tradeName: "Synthetic Coaches",
      registrationNo: "DRAFT-CR-0000",
      status: ProviderStatus.APPLIED,
      ownership: FleetOwnership.THIRD_PARTY,
      notes: "Seed applicant only — no verified licence fabricated",
    },
  });

  // Dev users — documented credentials only for local/dev
  await upsertUser("customer@haramain.local", "CustomerDev!234", RoleCode.CUSTOMER);
  await upsertUser("admin@haramain.local", "AdminDev!23456", RoleCode.SUPER_ADMIN);
  await upsertUser("dispatcher@haramain.local", "DispatchDev!234", RoleCode.FLEET_DISPATCHER);
  await upsertUser("compliance@haramain.local", "ComplianceDev!2", RoleCode.COMPLIANCE_OFFICER);
  await upsertUser("finance@haramain.local", "FinanceDev!2345", RoleCode.FINANCE_OFFICER);

  // eslint-disable-next-line no-console
  console.log("Seed complete (synthetic DRAFT data only).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
