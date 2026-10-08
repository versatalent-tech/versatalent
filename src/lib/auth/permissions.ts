/**
 * Team roles and what each one may do.
 *
 * - admin: everything.
 * - manager: the talents assigned to them, including fees and client details.
 * - road_manager: the schedule and logistics of their assigned talents; no money.
 *
 * Scoping to assigned talents happens in the queries (see getTalentScope);
 * this map only says which kinds of data a role can touch at all.
 */

export const TEAM_ROLES = ['admin', 'manager', 'road_manager'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  road_manager: 'Road Manager',
  staff: 'Event staff',
  artist: 'Talent',
  vip: 'VIP member',
};

export type Permission =
  | 'dashboard.view'
  | 'talents.view'
  | 'events.view'
  | 'bookings.view'
  | 'bookings.edit'
  | 'bookings.fees'
  | 'bookings.client_visibility'
  | 'bookings.logistics' // call time and logistics notes only
  | 'availability.edit'
  | 'rates.manage' // admins only: talents' commission rates
  | 'crm.view'
  | 'crm.edit'
  | 'crm.delete' // admins only: deleting clients, contacts and deals
  | 'enquiries.view' // website enquiries aren't tied to a talent, so managers see them all
  | 'team.manage'
  | 'venue.manage'; // POS, NFC, VIP, content: the existing admin sections

const ROLE_PERMISSIONS: Record<TeamRole, readonly Permission[] | '*'> = {
  admin: '*',
  manager: [
    'dashboard.view',
    'talents.view',
    'events.view',
    'bookings.view',
    'bookings.edit',
    'bookings.fees',
    'bookings.client_visibility',
    'bookings.logistics',
    'availability.edit',
    'crm.view',
    'crm.edit',
    'enquiries.view',
  ],
  road_manager: ['dashboard.view', 'talents.view', 'events.view', 'bookings.view', 'bookings.logistics', 'availability.edit'],
};

export function isTeamRole(role: string | undefined | null): role is TeamRole {
  return TEAM_ROLES.includes(role as TeamRole);
}

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!isTeamRole(role)) {
    return false;
  }
  const granted = ROLE_PERMISSIONS[role];
  return granted === '*' || granted.includes(permission);
}

/** Roles whose data is limited to the talents assigned to them */
export function isScopedRole(role: TeamRole): boolean {
  return role !== 'admin';
}
