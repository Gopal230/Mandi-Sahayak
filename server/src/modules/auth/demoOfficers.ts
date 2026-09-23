/**
 * The seeded SIH demonstration officers (server/imports/0005_demo_officer_accounts.sql).
 *
 * This list exists in exactly two places: here, read by the OTP issuer to
 * decide whether a fixed code applies, and in the seed import that creates
 * the matching accounts. It is not a credential and grants nothing by
 * itself — the phone number still has to belong to an ACTIVE OFFICER row for
 * `startStaffLogin` to issue any challenge at all.
 */
export type DemoOfficer = {
  phone: string; // E.164
  employeeCode: string;
  centreName: string;
  fullName: string;
};

export const DEMO_OFFICERS: readonly DemoOfficer[] = [
  {
    phone: '+919999900001',
    employeeCode: 'OFF-ALI-001',
    centreName: 'Aligarh Demonstration Procurement Centre',
    fullName: 'Aligarh Demonstration Officer',
  },
  {
    phone: '+919999900002',
    employeeCode: 'OFF-MAT-001',
    centreName: 'Mathura Demonstration Procurement Centre',
    fullName: 'Mathura Demonstration Officer',
  },
  {
    phone: '+919999900003',
    employeeCode: 'OFF-HAT-001',
    centreName: 'Hathras Demonstration Procurement Centre',
    fullName: 'Hathras Demonstration Officer',
  },
  {
    phone: '+919999900004',
    employeeCode: 'OFF-BUL-001',
    centreName: 'Bulandshahr Demonstration Procurement Centre',
    fullName: 'Bulandshahr Demonstration Officer',
  },
];

const DEMO_PHONES = new Set(DEMO_OFFICERS.map((o) => o.phone));

export function isDemoOfficerPhone(phone: string): boolean {
  return DEMO_PHONES.has(phone);
}
