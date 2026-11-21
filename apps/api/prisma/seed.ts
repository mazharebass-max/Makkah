import {
  PrismaClient,
  DocumentReviewState,
  FleetOwnership,
  NotificationChannel,
  PickupPointKind,
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

  const pickupPoints: {
    code: string;
    zoneId: string;
    nameEn: string;
    nameAr: string;
    kind: PickupPointKind;
    note: string;
  }[] = [
    {
      code: "JED-T1",
      zoneId: jed.id,
      nameEn: "Jeddah Airport Terminal 1 (draft)",
      nameAr: "مطار جدة — الصالة 1 (مسودة)",
      kind: PickupPointKind.AIRPORT_TERMINAL,
      note: "Synthetic meeting point — not a live ops claim",
    },
    {
      code: "JED-T2",
      zoneId: jed.id,
      nameEn: "Jeddah Airport Terminal 2 (draft)",
      nameAr: "مطار جدة — الصالة 2 (مسودة)",
      kind: PickupPointKind.AIRPORT_TERMINAL,
      note: "Synthetic meeting point — not a live ops claim",
    },
    {
      code: "MED-T1",
      zoneId: med.id,
      nameEn: "Madinah Airport arrivals (draft)",
      nameAr: "مطار المدينة — الوصول (مسودة)",
      kind: PickupPointKind.AIRPORT_TERMINAL,
      note: "Synthetic meeting point — not a live ops claim",
    },
    {
      code: "MAK-HOTEL-CORE",
      zoneId: makkah.id,
      nameEn: "Makkah hotel core (draft zone)",
      nameAr: "نواة فنادق مكة (مسودة)",
      kind: PickupPointKind.HOTEL_ZONE,
      note: "Zone placeholder — owner must approve real meeting points",
    },
  ];

  for (const p of pickupPoints) {
    await prisma.pickupPoint.upsert({
      where: { code: p.code },
      update: {
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        kind: p.kind,
        note: p.note,
        draftLabel: DRAFT,
        active: true,
        zoneId: p.zoneId,
      },
      create: { ...p, draftLabel: DRAFT, active: true },
    });
  }

  const featureFlags = [
    {
      key: "allow_live_payments",
      description: "Advisory only — env ALLOW_LIVE_PAYMENTS still gates capture",
    },
    {
      key: "allow_live_providers",
      description: "Advisory only — never auto-approve licences",
    },
    {
      key: "public_promotions",
      description: "Show promotional surfaces (default off)",
    },
    {
      key: "experimental_ui",
      description: "Experimental customer UI experiments (default off)",
    },
  ];
  for (const f of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      create: { ...f, enabled: false, draftLabel: DRAFT },
      update: { description: f.description, draftLabel: DRAFT },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: "support_contact" },
    create: {
      key: "support_contact",
      valueJson: { email: "support@haramain.local", mode: "sandbox" },
      draftLabel: DRAFT,
    },
    update: {},
  });
  await prisma.systemSetting.upsert({
    where: { key: "default_locale" },
    create: {
      key: "default_locale",
      valueJson: { locale: "en", alternate: "ar" },
      draftLabel: DRAFT,
    },
    update: {},
  });

  // Keep SEDAN / VAN codes for existing tests & quotes; display names match the public luxury fleet.
  const haramPak = await prisma.vehicleCategory.upsert({
    where: { code: "SEDAN" },
    update: {
      draftLabel: DRAFT,
      nameEn: "Haram Pak SUV",
      nameAr: "حرم باك SUV",
      passengerCap: 6,
      luggageCap: 8,
      active: true,
    },
    create: {
      code: "SEDAN",
      nameEn: "Haram Pak SUV",
      nameAr: "حرم باك SUV",
      passengerCap: 6,
      luggageCap: 8,
      draftLabel: DRAFT,
    },
  });
  const staria = await prisma.vehicleCategory.upsert({
    where: { code: "VAN" },
    update: {
      draftLabel: DRAFT,
      nameEn: "Hyundai Staria (high roof)",
      nameAr: "هيونداي ستاريا (سقف مرتفع)",
      passengerCap: 7,
      luggageCap: 10,
      active: true,
    },
    create: {
      code: "VAN",
      nameEn: "Hyundai Staria (high roof)",
      nameAr: "هيونداي ستاريا (سقف مرتفع)",
      passengerCap: 7,
      luggageCap: 10,
      draftLabel: DRAFT,
    },
  });
  const toyota = await prisma.vehicleCategory.upsert({
    where: { code: "TOYOTA_ALPHARD" },
    update: {
      draftLabel: DRAFT,
      nameEn: "Toyota Alphard-class",
      nameAr: "تويوتا ألفارد",
      passengerCap: 6,
      luggageCap: 6,
      active: true,
    },
    create: {
      code: "TOYOTA_ALPHARD",
      nameEn: "Toyota Alphard-class",
      nameAr: "تويوتا ألفارد",
      passengerCap: 6,
      luggageCap: 6,
      draftLabel: DRAFT,
    },
  });
  const gmc = await prisma.vehicleCategory.upsert({
    where: { code: "GMC_CLASS" },
    update: {
      draftLabel: DRAFT,
      nameEn: "GMC-class SUV",
      nameAr: "فئة جي إم سي",
      passengerCap: 7,
      luggageCap: 8,
      active: true,
    },
    create: {
      code: "GMC_CLASS",
      nameEn: "GMC-class SUV",
      nameAr: "فئة جي إم سي",
      passengerCap: 7,
      luggageCap: 8,
      draftLabel: DRAFT,
    },
  });
  const lexus = await prisma.vehicleCategory.upsert({
    where: { code: "LEXUS_CLASS" },
    update: {
      draftLabel: DRAFT,
      nameEn: "Lexus-class SUV",
      nameAr: "فئة لكزس",
      passengerCap: 4,
      luggageCap: 4,
      active: true,
    },
    create: {
      code: "LEXUS_CLASS",
      nameEn: "Lexus-class SUV",
      nameAr: "فئة لكزس",
      passengerCap: 4,
      luggageCap: 4,
      draftLabel: DRAFT,
    },
  });
  const mercedes = await prisma.vehicleCategory.upsert({
    where: { code: "MERCEDES_V" },
    update: {
      draftLabel: DRAFT,
      nameEn: "Mercedes V-Class",
      nameAr: "مرسيدس في-كلاس",
      passengerCap: 7,
      luggageCap: 7,
      active: true,
    },
    create: {
      code: "MERCEDES_V",
      nameEn: "Mercedes V-Class",
      nameAr: "مرسيدس في-كلاس",
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
    haramPak.id,
    "00000000-0000-4000-8000-000000000001",
    35_000,
    "Draft Haram Pak base — owner approval required",
  );
  await ensurePricing(
    staria.id,
    "00000000-0000-4000-8000-000000000002",
    48_000,
    "Draft Staria high-roof base — owner approval required",
  );
  await ensurePricing(
    coach.id,
    "00000000-0000-4000-8000-000000000003",
    120_000,
    "Draft coach base — owner approval required",
  );
  await ensurePricing(
    toyota.id,
    "00000000-0000-4000-8000-000000000004",
    55_000,
    "Draft Toyota Alphard-class base — owner approval required",
  );
  await ensurePricing(
    gmc.id,
    "00000000-0000-4000-8000-000000000005",
    52_000,
    "Draft GMC-class base — owner approval required",
  );
  await ensurePricing(
    lexus.id,
    "00000000-0000-4000-8000-000000000006",
    60_000,
    "Draft Lexus-class base — owner approval required",
  );
  await ensurePricing(
    mercedes.id,
    "00000000-0000-4000-8000-000000000007",
    70_000,
    "Draft Mercedes V-Class base — owner approval required",
  );

  // Three SEDAN (Haram Pak) units: overlap tests need two concurrent holds; payment /
  // settlement suites create additional quotes on the shared CI DB without colliding.
  // VEHICLE_A/B in driver-overlap.spec.ts are …010 / …011.
  const vehicles = [
    {
      id: "00000000-0000-4000-8000-000000000010",
      categoryId: haramPak.id,
      plateNumber: "SYN-HP1",
      makeModel: "Haram Pak SUV (synthetic)",
      passengerCap: 6,
      luggageCap: 8,
    },
    {
      id: "00000000-0000-4000-8000-000000000011",
      categoryId: haramPak.id,
      plateNumber: "SYN-HP2",
      makeModel: "Haram Pak SUV B (synthetic)",
      passengerCap: 6,
      luggageCap: 8,
    },
    {
      id: "00000000-0000-4000-8000-000000000017",
      categoryId: haramPak.id,
      plateNumber: "SYN-HP3",
      makeModel: "Haram Pak SUV C (synthetic)",
      passengerCap: 6,
      luggageCap: 8,
    },
    {
      id: "00000000-0000-4000-8000-000000000012",
      categoryId: staria.id,
      plateNumber: "SYN-ST1",
      makeModel: "Hyundai Staria high-roof (synthetic)",
      passengerCap: 7,
      luggageCap: 10,
    },
    {
      id: "00000000-0000-4000-8000-000000000013",
      categoryId: toyota.id,
      plateNumber: "SYN-TA1",
      makeModel: "Toyota Alphard-class (synthetic)",
      passengerCap: 6,
      luggageCap: 6,
    },
    {
      id: "00000000-0000-4000-8000-000000000014",
      categoryId: gmc.id,
      plateNumber: "SYN-GM1",
      makeModel: "GMC-class SUV (synthetic)",
      passengerCap: 7,
      luggageCap: 8,
    },
    {
      id: "00000000-0000-4000-8000-000000000015",
      categoryId: lexus.id,
      plateNumber: "SYN-LX1",
      makeModel: "Lexus-class SUV (synthetic)",
      passengerCap: 4,
      luggageCap: 4,
    },
    {
      id: "00000000-0000-4000-8000-000000000016",
      categoryId: mercedes.id,
      plateNumber: "SYN-MB1",
      makeModel: "Mercedes V-Class (synthetic)",
      passengerCap: 7,
      luggageCap: 7,
    },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: {
        active: true,
        categoryId: v.categoryId,
        plateNumber: v.plateNumber,
        makeModel: v.makeModel,
        passengerCap: v.passengerCap,
        luggageCap: v.luggageCap,
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
  await upsertUser("support@haramain.local", "SupportDev!2345", RoleCode.SUPPORT_AGENT);

  const templates: {
    code: string;
    channel: NotificationChannel;
    subjectEn: string;
    bodyEn: string;
    bodyAr: string;
  }[] = [
    {
      code: "otp_email",
      channel: NotificationChannel.EMAIL,
      subjectEn: "Your Haramain Ride verification code",
      bodyEn: "Your sandbox OTP is {{code}}. Not a live SMS/email delivery.",
      bodyAr: "رمز التحقق التجريبي هو {{code}}. ليست رسالة حقيقية.",
    },
    {
      code: "booking_created",
      channel: NotificationChannel.EMAIL,
      subjectEn: "Booking draft {{reference}}",
      bodyEn: "Booking {{reference}} created (PENDING_PAYMENT). Sandbox notice only.",
      bodyAr: "تم إنشاء الحجز {{reference}} (بانتظار الدفع). إشعار تجريبي فقط.",
    },
    {
      code: "booking_confirmed",
      channel: NotificationChannel.EMAIL,
      subjectEn: "Booking confirmed {{reference}}",
      bodyEn: "Booking {{reference}} confirmed via sandbox payment webhook.",
      bodyAr: "تم تأكيد الحجز {{reference}} عبر بوابة الدفع التجريبية.",
    },
    {
      code: "driver_assigned",
      channel: NotificationChannel.EMAIL,
      subjectEn: "Driver assigned for {{reference}}",
      bodyEn: "A driver was assigned to booking {{reference}}. Sandbox notice only.",
      bodyAr: "تم تعيين سائق للحجز {{reference}}. إشعار تجريبي فقط.",
    },
    {
      code: "booking_status",
      channel: NotificationChannel.EMAIL,
      subjectEn: "Trip update {{reference}}: {{status}}",
      bodyEn: "Booking {{reference}} is now {{status}}.",
      bodyAr: "الحجز {{reference}} أصبح {{status}}.",
    },
  ];
  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { code: t.code },
      update: {
        channel: t.channel,
        subjectEn: t.subjectEn,
        bodyEn: t.bodyEn,
        bodyAr: t.bodyAr,
      },
      create: t,
    });
  }

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

  // Second owned driver for overlap / shift tests (no login user required)
  await prisma.driver.upsert({
    where: { id: "00000000-0000-4000-8000-000000000031" },
    update: { active: true, ownership: FleetOwnership.OWNED },
    create: {
      id: "00000000-0000-4000-8000-000000000031",
      ownership: FleetOwnership.OWNED,
      displayName: "Synthetic Owned Driver B",
      phoneE164: "+966500000098",
      active: true,
    },
  });

  // Wide draft shift windows covering near-term synthetic trips (Asia/Riyadh ops)
  const shiftStart = new Date(Date.now() - 24 * 3600_000);
  const shiftEnd = new Date(Date.now() + 60 * 24 * 3600_000);
  for (const driverId of [
    "00000000-0000-4000-8000-000000000030",
    "00000000-0000-4000-8000-000000000031",
  ]) {
    const existing = await prisma.driverShift.findFirst({
      where: { driverId, note: "seed-wide-draft" },
    });
    if (!existing) {
      await prisma.driverShift.create({
        data: {
          driverId,
          startsAt: shiftStart,
          endsAt: shiftEnd,
          note: "seed-wide-draft",
          draftLabel: DRAFT,
        },
      });
    }
  }

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
