export enum Role {
  Dev = 'Dev',
  Facilitator = 'Facilitator',
  ProductManager = 'Product Manager',
  DeliveryManager = 'Delivery Manager',
  Communications = 'Communications',
  Infrastructure = 'Infrastructure',
  ContentWriter = 'Content Writer',
  Designer = 'Designer',
}

export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

export interface Participant {
  id: string;
  name: string;
  role: Role;
  gender: Gender;
}

export interface SelectionState {
  counts: Record<string, number>;
  history: string[][];
}
