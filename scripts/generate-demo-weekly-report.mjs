import { deliverWeeklyReport } from "../server/athar/weeklyDelivery.ts";

if (process.env.ATHAR_GENERATE_DEMO_REPORT !== "confirm") {
  throw new Error("Refusing to generate a report. Set ATHAR_GENERATE_DEMO_REPORT=confirm for the isolated demo data only.");
}

const result = await deliverWeeklyReport({
  organizationId: 1,
  guardianId: 450002,
  studentId: 450003,
});

console.log(JSON.stringify(result));
process.exit(0);
