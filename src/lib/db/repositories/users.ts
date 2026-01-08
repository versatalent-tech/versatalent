import { sql } from '../client';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types';
import bcrypt from 'bcryptjs';
import { createStripeCustomer } from '@/lib/services/stripe';

export async function getAllUsers(): Promise<User[]> {
  const users = await sql<User[]>`
    SELECT * FROM users
    ORDER BY created_at DESC
  `;
  return users;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await sql<User[]>`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `;
  return users[0] || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await sql<User[]>`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `;
  return users[0] || null;
}

export async function getUserByTalentId(talentId: string): Promise<User | null> {
  const users = await sql<User[]>`
    SELECT * FROM users WHERE talent_id = ${talentId} LIMIT 1
  `;
  return users[0] || null;
}

export async function getUsersByRole(role: string): Promise<User[]> {
  const users = await sql<User[]>`
    SELECT * FROM users WHERE role = ${role} ORDER BY created_at DESC
  `;
  return users;
}

export async function createUser(data: CreateUserRequest): Promise<User> {
  let passwordHash: string | null = null;

  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  // Create user in database first
  const users = await sql<User[]>`
    INSERT INTO users (name, email, password_hash, role, avatar_url, talent_id)
    VALUES (
      ${data.name},
      ${data.email},
      ${passwordHash},
      ${data.role},
      ${data.avatar_url || null},
      ${data.talent_id || null}
    )
    RETURNING *
  `;

  const user = users[0];

  // Create Stripe customer asynchronously
  // Don't block user creation if Stripe fails
  try {
    const stripeCustomer = await createStripeCustomer(user);

    // Update user with Stripe customer ID
    const updatedUsers = await sql<User[]>`
      UPDATE users
      SET stripe_customer_id = ${stripeCustomer.id}
      WHERE id = ${user.id}
      RETURNING *
    `;

    return updatedUsers[0];
  } catch (error) {
    console.error('Failed to create Stripe customer during user creation:', error);
    console.warn(`User ${user.id} created without Stripe customer. Stripe customer can be created later.`);

    // Return the user even if Stripe fails
    // The stripe_customer_id will be null and can be populated later
    return user;
  }
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(data.email);
  }
  if (data.password !== undefined) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    updates.push(`password_hash = $${paramIndex++}`);
    values.push(passwordHash);
  }
  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(data.role);
  }
  if (data.avatar_url !== undefined) {
    updates.push(`avatar_url = $${paramIndex++}`);
    values.push(data.avatar_url);
  }
  if (data.talent_id !== undefined) {
    updates.push(`talent_id = $${paramIndex++}`);
    values.push(data.talent_id);
  }
  if (data.stripe_customer_id !== undefined) {
    updates.push(`stripe_customer_id = $${paramIndex++}`);
    values.push(data.stripe_customer_id);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const users = await sql<User[]>(query, values);
  return users[0];
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM users WHERE id = ${id}
  `;
  return result.length > 0;
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.password_hash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  return isValid ? user : null;
}
