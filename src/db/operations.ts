import { count, sql } from 'drizzle-orm';
import { db } from './client';
import {
  customerProfiles,
  cmsPages,
  chats,
  disputes,
  notifications,
  orderItems,
  orders,
  payments,
  platformSettings,
  products,
  ratings,
  repairPhotos,
  repairQuotes,
  repairRequests,
  repairUpdates,
  serviceCategories,
  technicianProfiles,
  users,
} from './schema';

export async function initializeDatabase() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      status TEXT NOT NULL DEFAULT 'active',
      profile_image_url TEXT,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      address TEXT,
      city TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      preferred_language TEXT DEFAULT 'en',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS technician_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      bio TEXT,
      specializations TEXT,
      years_experience INTEGER DEFAULT 0,
      availability_status TEXT DEFAULT 'available',
      current_latitude DOUBLE PRECISION,
      current_longitude DOUBLE PRECISION,
      rating DOUBLE PRECISION DEFAULT 0,
      completed_jobs INTEGER DEFAULT 0,
      earnings DOUBLE PRECISION DEFAULT 0,
      vehicle_type TEXT,
      license_number TEXT,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS service_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS repair_requests (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES service_categories(id),
      device_type TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      issue_description TEXT NOT NULL,
      service_address TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      preferred_time TEXT,
      images JSONB DEFAULT '[]'::jsonb,
      service_fee DOUBLE PRECISION DEFAULT 0,
      quote_amount DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'submitted',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      is_gps_shared BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      completed_at TIMESTAMPTZ
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS repair_quotes (
      id SERIAL PRIMARY KEY,
      repair_request_id INTEGER REFERENCES repair_requests(id) ON DELETE CASCADE NOT NULL,
      technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      amount DOUBLE PRECISION NOT NULL,
      labor_hours INTEGER DEFAULT 1,
      estimated_completion TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS repair_photos (
      id SERIAL PRIMARY KEY,
      repair_request_id INTEGER REFERENCES repair_requests(id) ON DELETE CASCADE NOT NULL,
      technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      photo_url TEXT NOT NULL,
      caption TEXT,
      uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS repair_updates (
      id SERIAL PRIMARY KEY,
      repair_request_id INTEGER REFERENCES repair_requests(id) ON DELETE CASCADE NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      status TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT UNIQUE,
      category TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
      order_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
      shipping_fee DOUBLE PRECISION DEFAULT 0,
      total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      shipping_address TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price DOUBLE PRECISION NOT NULL,
      total_price DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      repair_request_id INTEGER REFERENCES repair_requests(id) ON DELETE SET NULL,
      payer_id INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      method TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      transaction_reference TEXT UNIQUE,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      repair_request_id INTEGER REFERENCES repair_requests(id) ON DELETE CASCADE,
      participant_one_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      participant_two_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      message TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      attachment_url TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      reference_id INTEGER,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      repair_request_id INTEGER REFERENCES repair_requests(id) ON DELETE CASCADE NOT NULL,
      customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      technician_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      score INTEGER NOT NULL,
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS disputes (
      id SERIAL PRIMARY KEY,
      repair_request_id INTEGER REFERENCES repair_requests(id) ON DELETE CASCADE,
      reported_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      resolved_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      resolution_note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      resolved_at TIMESTAMPTZ
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      report_type TEXT NOT NULL,
      summary JSONB DEFAULT '{}'::jsonb,
      generated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cms_pages (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length === 0) {
    const insertedUsers = await db.insert(users).values([
      { fullName: 'Alicia Chen', email: 'alicia@teckup.app', role: 'customer', status: 'active' },
      { fullName: 'Mika Patel', email: 'mika@teckup.app', role: 'technician', status: 'active' },
      { fullName: 'Jordan Brooks', email: 'jordan@teckup.app', role: 'manager', status: 'active' },
      { fullName: 'Sam Rivera', email: 'sam@teckup.app', role: 'admin', status: 'active' },
    ]).returning({ id: users.id });

    const [customerUser, technicianUser, managerUser, adminUser] = insertedUsers;

    await db.insert(customerProfiles).values({
      userId: customerUser.id,
      address: '123 Market Street',
      city: 'Lagos',
      latitude: 6.5244,
      longitude: 3.3792,
      preferredLanguage: 'en',
    });

    await db.insert(technicianProfiles).values({
      userId: technicianUser.id,
      bio: 'Certified mobile and laptop technician',
      specializations: 'Smartphones,Laptops',
      yearsExperience: 7,
      rating: 4.9,
      completedJobs: 184,
      earnings: 14250,
      isVerified: true,
    });

    await db.insert(serviceCategories).values([
      { name: 'Smartphone Repair', description: 'Screen, battery, charging issues', icon: 'smartphone' },
      { name: 'Laptop Repair', description: 'Keyboard, motherboard, diagnostics', icon: 'laptop' },
      { name: 'Gadget Sales', description: 'Phones, accessories and gadgets', icon: 'device' },
    ]);

    await db.insert(products).values([
      { name: 'Smartphone Battery Pack', description: 'High-capacity replacement battery', sku: 'BAT-1001', category: 'Spare Parts', price: 49.99, stockQuantity: 22, isFeatured: true },
      { name: 'Laptop Cooling Fan', description: 'Quiet replacement fan', sku: 'FAN-2001', category: 'Spare Parts', price: 79.5, stockQuantity: 10, isFeatured: true },
      { name: 'Wireless Earbuds Pro', description: 'Noise-cancelling earbuds', sku: 'EAR-3001', category: 'Gadgets', price: 129.99, stockQuantity: 18 },
    ]);

    const repairRequest = await db.insert(repairRequests).values({
      customerId: customerUser.id,
      technicianId: technicianUser.id,
      categoryId: 1,
      deviceType: 'Smartphone',
      brand: 'iPhone',
      model: '14 Pro',
      issueDescription: 'Battery drains quickly and screen flickers',
      serviceAddress: '123 Market Street, Lagos',
      serviceFee: 25,
      quoteAmount: 89.99,
      status: 'assigned',
      paymentStatus: 'paid',
      isGpsShared: true,
    }).returning({ id: repairRequests.id });

    await db.insert(repairQuotes).values({
      repairRequestId: repairRequest[0].id,
      technicianId: technicianUser.id,
      amount: 89.99,
      laborHours: 2,
      estimatedCompletion: 'Today by 6 PM',
      notes: 'Battery replacement and screen test',
      status: 'approved',
    });

    await db.insert(repairPhotos).values({
      repairRequestId: repairRequest[0].id,
      technicianId: technicianUser.id,
      photoUrl: 'https://example.com/device.jpg',
      caption: 'Initial device condition',
    });

    await db.insert(repairUpdates).values({
      repairRequestId: repairRequest[0].id,
      userId: technicianUser.id,
      message: 'Technician started diagnostic checks',
      status: 'in-progress',
    });

    await db.insert(orders).values({
      customerId: customerUser.id,
      orderNumber: 'ORD-1001',
      status: 'completed',
      subtotal: 129.99,
      shippingFee: 5,
      totalAmount: 134.99,
      paymentStatus: 'paid',
      shippingAddress: '123 Market Street, Lagos',
    });

    await db.insert(orderItems).values({
      orderId: 1,
      productId: 3,
      quantity: 1,
      unitPrice: 129.99,
      totalPrice: 129.99,
    });

    await db.insert(payments).values({
      orderId: 1,
      repairRequestId: repairRequest[0].id,
      payerId: customerUser.id,
      amount: 134.99,
      method: 'card',
      status: 'paid',
      transactionReference: 'txn-1001',
    });

    await db.insert(notifications).values([
      { userId: customerUser.id, title: 'Repair assigned', body: 'A technician has been assigned to your repair request.', type: 'repair' },
      { userId: technicianUser.id, title: 'New job', body: 'A new repair request is waiting for your response.', type: 'job' },
    ]);

    await db.insert(ratings).values({
      repairRequestId: repairRequest[0].id,
      customerId: customerUser.id,
      technicianId: technicianUser.id,
      score: 5,
      comment: 'Excellent service and clear communication.',
    });

    await db.insert(platformSettings).values([
      { key: 'service_fee_default', value: '25' },
      { key: 'commission_rate', value: '0.1' },
    ]);

    await db.insert(cmsPages).values({
      slug: 'about',
      title: 'About TeckUP',
      content: 'TeckUP connects customers to certified mobile technicians for convenient device repairs.',
      isPublished: true,
    });

    await db.insert(disputes).values({
      repairRequestId: repairRequest[0].id,
      reportedById: customerUser.id,
      title: 'Quote dispute',
      description: 'Customer requested a lower repair total.',
      status: 'open',
    });

    await db.insert(chats).values({
      repairRequestId: repairRequest[0].id,
      participantOneId: customerUser.id,
      participantTwoId: technicianUser.id,
    });
  }
}

export async function getDashboardSummary() {
  const [userCountResult, repairCountResult, productCountResult, orderCountResult, paymentCountResult] = await Promise.all([
    db.select({ count: count(users.id) }).from(users),
    db.select({ count: count(repairRequests.id) }).from(repairRequests),
    db.select({ count: count(products.id) }).from(products),
    db.select({ count: count(orders.id) }).from(orders),
    db.select({ count: count(payments.id) }).from(payments),
  ]);

  return {
    userCount: Number(userCountResult[0]?.count ?? 0),
    repairCount: Number(repairCountResult[0]?.count ?? 0),
    productCount: Number(productCountResult[0]?.count ?? 0),
    orderCount: Number(orderCountResult[0]?.count ?? 0),
    paymentCount: Number(paymentCountResult[0]?.count ?? 0),
  };
}
