import {
  PrismaClient,
  DocumentReviewState,
  FleetOwnership,
  ProviderStatus,
} from "@prisma/client";
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
      customerProfile:
        roleCode === RoleCode.CUSTOMER ? { create: { displayName: email.split("@")[0] } } : undefined,
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

async function ensurePricing(categoryId: string, ruleId: string, baseHalalas: number, name: string) {
  const existing = await prisma.pricingRule.findUnique({ where: { id: ruleId } });
  if (existing) {
    await prisma.pricingRule.update({
      where: { id: ruleId },
      data: { draftLabel: DRAFT, active: true, name },
    });
    const latest = await prisma.pricingRuleVersion.findFirst({
      where: { pricingRuleId: ruleId },
      orderBy: { version: "desc" },
    });
    if (!latest) {
      await prisma.pricingRuleVersion.create({
        data: { pricingRuleId: ruleId, version: 1, baseHalalas, currency: "SAR" },
      });
    }
    return;
  }
  await prisma.pricingRule.create({
    data: {
      id: ruleId,
      categoryId,
      name,
      draftLabel: DRAFT,
      versions: { create: { version: 1, baseHalalas, currency: "SAR" } },
    },
  });
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

  const jed = await prisma.serviceZone.upsert({
    where: { code: "JED_AIRPORT" },
    update: {},
    create: { code: "JED_AIRPORT", nameEn: "Jeddah Airport (JED)", nameAr: "مطار جدة" },
  });
  const jeddahCity = await prisma.serviceZone.upsert({
    where: { code: "JEDDAH_CITY" },
    update: {},
    create: { code: "JEDDAH_CITY", nameEn: "Jeddah city", nameAr: "مدينة جدة" },
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
  const med = await prisma.serviceZone.upsert({
    where: { code: "MED_AIRPORT" },
    update: {},
    create: {
      code: "MED_AIRPORT",
      nameEn: "Madinah Airport (MED)",
      nameAr: "مطار المدينة",
    },
  });

  const routes = [
    {
      code: "JED-MAKKAH",
      nameEn: "JED Airport ↔ Makkah hotels",
      nameAr: "مطار جدة ↔ فنادق مكة",
      fromZoneId: jed.id,
      toZoneId: makkah.id,
    },
    {
      code: "JEDDAH-MAKKAH",
      nameEn: "Jeddah city ↔ Makkah",
      nameAr: "جدة ↔ مكة",
      fromZoneId: jeddahCity.id,
      toZoneId: makkah.id,
    },
    {
      code: "MAKKAH-MADINAH",
      nameEn: "Makkah ↔ Madinah",
      nameAr: "مكة ↔ المدينة",
      fromZoneId: makkah.id,
      toZoneId: madinah.id,
    },
    {
      code: "MED-MADINAH",
      nameEn: "MED Airport ↔ Madinah hotels",
      nameAr: "مطار المدينة ↔ فنادق المدينة",
      fromZoneId: med.id,
      toZoneId: madinah.id,
    },
  ];

  for (const r of routes) {
    await prisma.route.upsert({
      where: { code: r.code },
      update: { draftLabel: DRAFT, nameEn: r.nameEn, nameAr: r.nameAr, active: true },
      create: { ...r, draftLabel: DRAFT },
    });
  }

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
  const van = await prisma.vehicleCategory.upsert({
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
  // Catalog category with pricing but zero eligible inventory — honest empty state
  const coach = await prisma.vehicleCategory.upsert({
    where: { code: "COACH" },
    update: { draftLabel: DRAFT },
    create: {
      code: "COACH",
      nameEn: "Coach",
      nameAr: "حافلة",
      passengerCap: 20,
      luggageCap: 20,
      draftLabel: DRAFT,
    },
  });

  await ensurePricing(
    sedan.id,
    "00000000-0000-4000-8000-000000000001",
    25_000,
    "Draft sedan base — owner approval required",
  );
  await ensurePricing(
    van.id,
    "00000000-0000-4000-8000-000000000002",
    45_000,
    "Draft van base — owner approval required",
  );
  await ensurePricing(
    coach.id,
    "00000000-0000-4000-8000-000000000003",
    120_000,
    "Draft coach base — owner approval required",
  );

  const vehicles = [
    {
      id: "00000000-0000-4000-8000-000000000010",
      categoryId: sedan.id,
      plateNumber: "SYN-001",
      makeModel: "Synthetic Sedan",
      passengerCap: 3,
      luggageCap: 3,
    },
    {
      id: "00000000-0000-4000-8000-000000000011",
      categoryId: sedan.id,
      plateNumber: "SYN-002",
      makeModel: "Synthetic Sedan B",
      passengerCap: 3,
      luggageCap: 3,
    },
    {
      id: "00000000-0000-4000-8000-000000000012",
      categoryId: van.id,
      plateNumber: "SYN-V01",
      makeModel: "Synthetic Van",
      passengerCap: 7,
      luggageCap: 7,
    },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: {
        active: true,
        availabilityNote: "Synthetic seed inventory — not live availability",
      },
      create: {
        ...v,
        ownership: FleetOwnership.OWNED,
        modelYear: 2024,
        availabilityNote: "Synthetic seed inventory — not live availability",
      },
    });
  }

  const providerA = await prisma.provider.upsert({
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

  const providerB = await prisma.provider.upsert({
    where: { id: "00000000-0000-4000-8000-000000000021" },
    update: { status: ProviderStatus.APPLIED, notes: DRAFT },
    create: {
      id: "00000000-0000-4000-8000-000000000021",
      legalName: "Isolation Test Provider B (DRAFT)",
      tradeName: "Iso B",
      registrationNo: "DRAFT-CR-0001",
      status: ProviderStatus.APPLIED,
      ownership: FleetOwnership.THIRD_PARTY,
      notes: "Second seed provider for isolation tests — unverified",
    },
  });

  await upsertUser("customer@haramain.local", "CustomerDev!234", RoleCode.CUSTOMER);
  await upsertUser("admin@haramain.local", "AdminDev!23456", RoleCode.SUPER_ADMIN);
  await upsertUser("dispatcher@haramain.local", "DispatchDev!234", RoleCode.FLEET_DISPATCHER);
  await upsertUser("fleet@haramain.local", "FleetMgrDev!2345", RoleCode.OWNED_FLEET_MANAGER);
  await upsertUser("compliance@haramain.local", "ComplianceDev!2", RoleCode.COMPLIANCE_OFFICER);
  await upsertUser("finance@haramain.local", "FinanceDev!2345", RoleCode.FINANCE_OFFICER);

  const applicantA = await upsertUser(
    "provider-a@haramain.local",
    "ProviderADev!234",
    RoleCode.PROVIDER_APPLICANT,
  );
  const applicantB = await upsertUser(
    "provider-b@haramain.local",
    "ProviderBDev!234",
    RoleCode.PROVIDER_APPLICANT,
  );

  await prisma.provider.update({
    where: { id: providerA.id },
    data: { userId: applicantA.id },
  });
  await prisma.provider.update({
    where: { id: providerB.id },
    data: { userId: applicantB.id },
  });

  const applicantRole = await prisma.role.findUniqueOrThrow({
    where: { code: RoleCode.PROVIDER_APPLICANT },
  });
  await prisma.roleAssignment.updateMany({
    where: { userId: applicantA.id, roleId: applicantRole.id },
    data: { providerId: providerA.id },
  });
  await prisma.roleAssignment.updateMany({
    where: { userId: applicantB.id, roleId: applicantRole.id },
    data: { providerId: providerB.id },
  });

  await prisma.providerDocument.upsert({
    where: { id: "00000000-0000-4000-8000-000000000040" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000040",
      providerId: providerA.id,
      docType: "commercial_registration",
      storageKey: "sandbox://provider-a/cr.pdf",
      reviewState: DocumentReviewState.SUBMITTED,
      draftLabel: DRAFT,
    },
  });
  await prisma.providerDocument.upsert({
    where: { id: "00000000-0000-4000-8000-000000000041" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000041",
      providerId: providerB.id,
      docType: "commercial_registration",
      storageKey: "sandbox://provider-b/cr.pdf",
      reviewState: DocumentReviewState.SUBMITTED,
      draftLabel: DRAFT,
    },
  });
  // Expired doc sample for expiry job
  await prisma.providerDocument.upsert({
    where: { id: "00000000-0000-4000-8000-000000000042" },
    update: {
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      reviewState: DocumentReviewState.SUBMITTED,
    },
    create: {
      id: "00000000-0000-4000-8000-000000000042",
      providerId: providerA.id,
      docType: "insurance",
      storageKey: "sandbox://provider-a/insurance-expired.pdf",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      reviewState: DocumentReviewState.SUBMITTED,
      draftLabel: DRAFT,
    },
  });

  const driverUser = await upsertUser(
    "driver@haramain.local",
    "DriverDev!23456",
    RoleCode.DRIVER,
  );

  await prisma.driver.upsert({
    where: { id: "00000000-0000-4000-8000-000000000030" },
    update: { active: true, ownership: FleetOwnership.OWNED, userId: driverUser.id },
    create: {
      id: "00000000-0000-4000-8000-000000000030",
      userId: driverUser.id,
      ownership: FleetOwnership.OWNED,
      displayName: "Synthetic Owned Driver",
      phoneE164: "+966500000099",
      active: true,
    },
  });

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
