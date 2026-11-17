export enum TICKET_STATUS {
  NEW = 'new',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TICKET_PRIORITY {
  LOW = 'low',
  NORMAL = 'normal',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TICKET_ORIGIN {
  CHAT = 'chat',
  CUSTOMER_PORTAL = 'customer_portal',
}

export enum TICKET_MOTIVE {
  ORDER = 'order',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  PRODUCT = 'product',
  ACCOUNT = 'account',
  OTHER = 'other',
}
