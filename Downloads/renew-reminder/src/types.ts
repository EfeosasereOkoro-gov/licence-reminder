export type ItemKey =
  | 'id-card'
  | 'drivers-licence'
  | 'passport'
  | 'vehicle-registration'
  | 'permit'
  | 'custom';

export type Channel = 'email' | 'sms';

export interface Answers {
  itemType: ItemKey | null;
  customName: string;
  expiryDay: string;
  expiryMonth: string;
  expiryYear: string;
  /** Days-before-expiry the user picked on Check Answers. */
  reminderOffsets: number[];
  channel: Channel | null;
  email: string;
  phone: string;
}

export interface StoredReminder {
  id: string;
  itemLabel: string;
  expiryISO: string;
  channel: Channel;
  /** Days-before-expiry chosen by the user. Each becomes a calendar event. */
  reminderOffsets: number[];
  /** Computed calendar dates, one per offset. ISO strings. */
  reminderDates: string[];
  createdAtISO: string;
  retainUntilISO: string;
}

export const ITEM_LABELS: Record<ItemKey, string> = {
  'id-card': 'National ID Card',
  'drivers-licence': "Driver's Licence",
  passport: 'Passport',
  'vehicle-registration': 'Vehicle Registration',
  permit: 'Permit',
  custom: 'Other',
};

export const ITEM_HINTS: Record<ItemKey, string> = {
  'id-card': 'Barbados National Identification Card',
  'drivers-licence': 'Issued by the Barbados Licensing Authority',
  passport: 'Travel document',
  'vehicle-registration': 'Registration certificate for a car, van, or motorcycle',
  permit: 'Work permit, business permit, or similar',
  custom: "Anything else with an expiry date — you'll name it on the next step",
};
