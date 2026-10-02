import { boolean, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  phone: text('phone'),
  role: text('role').notNull().default('customer'),
  status: text('status').notNull().default('active'),
  profileImageUrl: text('profile_image_url'),
  isVerified: boolean('is_verified').notNull().default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customerProfiles = pgTable('customer_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  address: text('address'),
  city: text('city'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  preferredLanguage: text('preferred_language').default('en'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const technicianProfiles = pgTable('technician_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  bio: text('bio'),
  specializations: text('specializations'),
  yearsExperience: integer('years_experience').default(0),
  availabilityStatus: text('availability_status').default('available'),
  currentLatitude: doublePrecision('current_latitude'),
  currentLongitude: doublePrecision('current_longitude'),
  rating: doublePrecision('rating').default(0),
  completedJobs: integer('completed_jobs').default(0),
  earnings: doublePrecision('earnings').default(0),
  vehicleType: text('vehicle_type'),
  licenseNumber: text('license_number'),
  isVerified: boolean('is_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const serviceCategories = pgTable('service_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const repairRequests = pgTable('repair_requests', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => users.id, { onDelete: 'set null' }),
  technicianId: integer('technician_id').references(() => users.id, { onDelete: 'set null' }),
  categoryId: integer('category_id').references(() => serviceCategories.id),
  deviceType: text('device_type').notNull(),
  brand: text('brand'),
  model: text('model'),
  issueDescription: text('issue_description').notNull(),
  serviceAddress: text('service_address'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  preferredTime: text('preferred_time'),
  images: jsonb('images').default([]),
  serviceFee: doublePrecision('service_fee').default(0),
  quoteAmount: doublePrecision('quote_amount'),
  status: text('status').notNull().default('submitted'),
  paymentStatus: text('payment_status').notNull().default('pending'),
  isGpsShared: boolean('is_gps_shared').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const repairQuotes = pgTable('repair_quotes', {
  id: serial('id').primaryKey(),
  repairRequestId: integer('repair_request_id').references(() => repairRequests.id, { onDelete: 'cascade' }).notNull(),
  technicianId: integer('technician_id').references(() => users.id, { onDelete: 'set null' }),
  amount: doublePrecision('amount').notNull(),
  laborHours: integer('labor_hours').default(1),
  estimatedCompletion: text('estimated_completion'),
  notes: text('notes'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const repairPhotos = pgTable('repair_photos', {
  id: serial('id').primaryKey(),
  repairRequestId: integer('repair_request_id').references(() => repairRequests.id, { onDelete: 'cascade' }).notNull(),
  technicianId: integer('technician_id').references(() => users.id, { onDelete: 'set null' }),
  photoUrl: text('photo_url').notNull(),
  caption: text('caption'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

export const repairUpdates = pgTable('repair_updates', {
  id: serial('id').primaryKey(),
  repairRequestId: integer('repair_request_id').references(() => repairRequests.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  message: text('message').notNull(),
  status: text('status'),
  isCustomerVisible: boolean('is_customer_visible').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku').unique(),
  category: text('category').notNull(),
  price: doublePrecision('price').notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  imageUrl: text('image_url'),
  isFeatured: boolean('is_featured').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
  orderNumber: text('order_number').notNull().unique(),
  status: text('status').notNull().default('pending'),
  subtotal: doublePrecision('subtotal').notNull().default(0),
  shippingFee: doublePrecision('shipping_fee').default(0),
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  paymentStatus: text('payment_status').notNull().default('pending'),
  shippingAddress: text('shipping_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: doublePrecision('unit_price').notNull(),
  totalPrice: doublePrecision('total_price').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
  repairRequestId: integer('repair_request_id').references(() => repairRequests.id, { onDelete: 'set null' }),
  payerId: integer('payer_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
  amount: doublePrecision('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  method: text('method'),
  status: text('status').notNull().default('pending'),
  transactionReference: text('transaction_reference').unique(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  repairRequestId: integer('repair_request_id').references(() => repairRequests.id, { onDelete: 'cascade' }),
  participantOneId: integer('participant_one_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  participantTwoId: integer('participant_two_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  chatId: integer('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
  senderId: integer('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  message: text('message').notNull(),
  messageType: text('message_type').notNull().default('text'),
  attachmentUrl: text('attachment_url'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: text('type').notNull().default('info'),
  referenceId: integer('reference_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ratings = pgTable('ratings', {
  id: serial('id').primaryKey(),
  repairRequestId: integer('repair_request_id').references(() => repairRequests.id, { onDelete: 'cascade' }).notNull(),
  customerId: integer('customer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  technicianId: integer('technician_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  score: integer('score').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const disputes = pgTable('disputes', {
  id: serial('id').primaryKey(),
  repairRequestId: integer('repair_request_id').references(() => repairRequests.id, { onDelete: 'cascade' }),
  reportedById: integer('reported_by_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('open'),
  resolvedById: integer('resolved_by_id').references(() => users.id, { onDelete: 'set null' }),
  resolutionNote: text('resolution_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  reportType: text('report_type').notNull(),
  summary: jsonb('summary').default({}),
  generatedById: integer('generated_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cmsPages = pgTable('cms_pages', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
