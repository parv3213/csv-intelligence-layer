import type { CanonicalSchema } from '@/types';

export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  schema: CanonicalSchema;
}

export const schemaTemplates: SchemaTemplate[] = [
  {
    id: 'ecommerce-orders',
    name: 'E-commerce Orders',
    description: 'Order data with customer info, amounts, dates, and status tracking',
    icon: '🛒',
    schema: {
      name: 'E-commerce Orders',
      version: '1.0.0',
      description: 'Schema for e-commerce order data',
      columns: [
        {
          name: 'order_id',
          type: 'string',
          required: true,
          description: 'Unique order identifier',
          aliases: ['orderId', 'order_number', 'orderNumber', 'id'],
        },
        {
          name: 'customer_email',
          type: 'email',
          required: true,
          description: 'Customer email address',
          aliases: ['email', 'customerEmail', 'customer_mail', 'buyer_email'],
        },
        {
          name: 'amount',
          type: 'float',
          required: true,
          description: 'Order total amount',
          aliases: ['total', 'order_total', 'price', 'order_amount'],
          validators: [{ type: 'min', value: 0, message: 'Amount must be positive' }],
        },
        {
          name: 'currency',
          type: 'string',
          required: false,
          default: 'USD',
          description: 'Currency code',
          aliases: ['currency_code'],
          validators: [
            {
              type: 'enum',
              values: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
              message: 'Invalid currency',
            },
          ],
        },
        {
          name: 'order_date',
          type: 'datetime',
          required: true,
          description: 'Date and time of order',
          aliases: ['date', 'created_at', 'orderDate', 'purchase_date', 'timestamp'],
        },
        {
          name: 'status',
          type: 'string',
          required: true,
          description: 'Order status',
          aliases: ['order_status', 'state'],
          validators: [
            {
              type: 'enum',
              values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
              message: 'Invalid order status',
            },
          ],
        },
      ],
      errorPolicy: 'flag',
      strict: false,
    },
  },
  {
    id: 'user-records',
    name: 'User Records',
    description: 'User profile data with contact info and location',
    icon: '👤',
    schema: {
      name: 'User Records',
      version: '1.0.0',
      description: 'Schema for user/customer records',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          description: 'Unique user identifier',
          aliases: ['user_id', 'userId', 'uid'],
        },
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Full name',
          aliases: ['full_name', 'fullName', 'customer_name', 'display_name'],
        },
        {
          name: 'email',
          type: 'email',
          required: true,
          description: 'Email address',
          aliases: ['email_address', 'mail', 'e_mail'],
        },
        {
          name: 'phone',
          type: 'string',
          required: false,
          nullable: true,
          description: 'Phone number',
          aliases: ['phone_number', 'phoneNumber', 'mobile', 'tel'],
        },
        {
          name: 'created_at',
          type: 'datetime',
          required: true,
          description: 'Account creation date',
          aliases: ['createdAt', 'signup_date', 'registered_at', 'join_date'],
        },
        {
          name: 'country',
          type: 'string',
          required: false,
          nullable: true,
          description: 'Country of residence',
          aliases: ['country_code', 'location', 'region'],
        },
      ],
      errorPolicy: 'flag',
      strict: false,
    },
  },
  {
    id: 'financial-transactions',
    name: 'Financial Transactions',
    description: 'Transaction records with amounts, currencies, and categories',
    icon: '💰',
    schema: {
      name: 'Financial Transactions',
      version: '1.0.0',
      description: 'Schema for financial transaction data',
      columns: [
        {
          name: 'txn_id',
          type: 'string',
          required: true,
          description: 'Transaction identifier',
          aliases: ['transaction_id', 'transactionId', 'id', 'ref', 'reference'],
        },
        {
          name: 'amount',
          type: 'float',
          required: true,
          description: 'Transaction amount',
          aliases: ['value', 'sum', 'total'],
        },
        {
          name: 'currency',
          type: 'string',
          required: true,
          description: 'Currency code',
          aliases: ['currency_code', 'ccy'],
          validators: [
            {
              type: 'enum',
              values: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY'],
              message: 'Invalid currency code',
            },
          ],
        },
        {
          name: 'timestamp',
          type: 'datetime',
          required: true,
          description: 'Transaction date and time',
          aliases: ['date', 'txn_date', 'transaction_date', 'created_at'],
        },
        {
          name: 'category',
          type: 'string',
          required: false,
          nullable: true,
          description: 'Transaction category',
          aliases: ['type', 'txn_type', 'transaction_type'],
        },
        {
          name: 'description',
          type: 'string',
          required: false,
          nullable: true,
          description: 'Transaction description or memo',
          aliases: ['memo', 'note', 'notes', 'details'],
        },
      ],
      errorPolicy: 'flag',
      strict: false,
    },
  },
  {
    id: 'generic-contacts',
    name: 'Generic Contacts',
    description: 'Contact list with name, email, phone, and address',
    icon: '📇',
    schema: {
      name: 'Generic Contacts',
      version: '1.0.0',
      description: 'Schema for contact list data',
      columns: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Contact name',
          aliases: ['full_name', 'fullName', 'contact_name', 'person'],
        },
        {
          name: 'email',
          type: 'email',
          required: false,
          nullable: true,
          description: 'Email address',
          aliases: ['email_address', 'mail', 'e_mail'],
        },
        {
          name: 'phone',
          type: 'string',
          required: false,
          nullable: true,
          description: 'Phone number',
          aliases: ['phone_number', 'phoneNumber', 'mobile', 'tel', 'telephone'],
        },
        {
          name: 'address',
          type: 'string',
          required: false,
          nullable: true,
          description: 'Mailing address',
          aliases: ['street_address', 'mailing_address', 'location'],
        },
        {
          name: 'notes',
          type: 'string',
          required: false,
          nullable: true,
          description: 'Additional notes',
          aliases: ['note', 'comments', 'description', 'memo'],
        },
      ],
      errorPolicy: 'flag',
      strict: false,
    },
  },
];

export function getTemplateById(id: string): SchemaTemplate | undefined {
  return schemaTemplates.find((t) => t.id === id);
}
