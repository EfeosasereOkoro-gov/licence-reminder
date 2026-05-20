export type ItemKey =
  | 'drivers-licence'
  | 'vehicle-registration'
  | 'passport'
  | 'permit'
  | 'custom';

export type Channel = 'email' | 'sms';

export interface Answers {
  itemType: ItemKey | null;
  customName: string;
  expiryDay: string;
  expiryMonth: string;
  expiryYear: string;
  channel: Channel | null;
  email: string;
  phone: string;
}

export interface StoredReminder {
  id: string;
  itemLabel: string;
  expiryISO: string;
  channel: Channel;
  reminderDates: string[];
  createdAtISO: string;
  retainUntilISO: string;
}

export const ITEM_LABELS: Record<ItemKey, string> = {
  'drivers-licence': "Driver's Licence",
  'vehicle-registration': 'Vehicle Registration',
  passport: 'Passport',
  permit: 'Permit',
  custom: 'Other',
};

export const ITEM_HINTS: Record<ItemKey, string> = {
  'drivers-licence': 'Issued by the Barbados Licensing Authority',
  'vehicle-registration': 'Registration certificate for a car, van, or motorcycle',
  passport: 'Travel document',
  permit: 'Work permit, business permit, or similar',
  custom: 'Give it a short name (for example, "Boat licence")',
};
