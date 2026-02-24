# Talent User Accounts System

## Overview

When you create a new talent profile through the admin panel, the system now automatically creates a user account for that talent. This allows talents to access the VersaTalent dashboard and manage their profile.

## How It Works

### Automatic Account Creation

When a new talent is created via `/admin/talents`:

1. **Talent Profile Created**: The talent's profile is saved to the database
2. **User Account Generated**: A user account is automatically created with:
   - **Email**: Auto-generated from the talent's name (e.g., "John Doe" → `john.doe@versatalent.com`)
   - **Password**: Secure 12-character random password
   - **Role**: Set to `artist` automatically
   - **Linked Profile**: The user account is linked to the talent via `talent_id`

3. **Credentials Displayed**: The generated email and password are shown in the success message after creation

### Example Workflow

1. Admin creates a talent named "Jessica Dias"
2. System generates:
   - Email: `jessica.dias@versatalent.com`
   - Password: `H7k#9mP2$qR5` (example - actual passwords are random)
3. Admin receives credentials in success message
4. Admin shares credentials with Jessica
5. Jessica can now login at `/dashboard` with her credentials

## Features

### Secure Password Generation

Passwords are automatically generated with:
- 12 characters long
- Mix of uppercase letters (A-Z, excluding I, O)
- Mix of lowercase letters (a-z, excluding i, l, o)
- Numbers (2-9, excluding 0, 1)
- Special symbols (!@#$%&*+-=?)
- Randomized order
- No easily confused characters

### Email Generation

Emails are generated from the talent's name:
- Converted to lowercase
- Spaces replaced with dots
- Special characters removed
- Domain: `@versatalent.com`

Examples:
- "John Doe" → `john.doe@versatalent.com`
- "Mary-Jane Watson" → `maryjane.watson@versatalent.com`
- "DJ Mike" → `dj.mike@versatalent.com`

### Database Linking

- Each talent can only have ONE user account (unique constraint)
- User accounts are linked via `users.talent_id` → `talents.id`
- Foreign key ensures data integrity
- If talent is deleted, user's talent_id is set to NULL

## Admin Usage

### Creating a Talent with User Account

1. Navigate to `/admin/talents`
2. Click "Add New Talent"
3. Fill in all required fields:
   - Name *
   - Profession *
   - Industry *
   - Gender *
   - Age Group *
   - Location *
   - Tagline *
   - Bio *
   - Profile Image *
4. Click "Create Talent"
5. **IMPORTANT**: Copy the credentials from the success message!

### Success Message Example

```
Talent profile created successfully!

🔐 USER LOGIN CREDENTIALS (SAVE THESE!):
Email: john.doe@versatalent.com
Password: H7k#9mP2$qR5

Please share these credentials with John Doe so they can access
their dashboard at /dashboard
```

### Sharing Credentials with Talents

**Best Practices:**

1. ✅ Copy credentials immediately after creation
2. ✅ Send via secure channel (encrypted email, SMS, or in person)
3. ✅ Instruct talent to change password after first login
4. ✅ Confirm talent can successfully login
5. ❌ Don't share credentials over insecure channels
6. ❌ Don't lose the credentials (they're shown only once)

## Talent Dashboard Access

Once a talent has their credentials, they can:

1. Visit `/dashboard`
2. Login with their email and password
3. View and manage their profile
4. Update portfolio items
5. Track their events and bookings
6. View their statistics

## Technical Details

### Database Schema

**Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL, -- 'artist', 'vip', 'staff', 'admin'
  avatar_url TEXT,
  talent_id UUID UNIQUE, -- FK to talents.id
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT fk_users_talent_id
    FOREIGN KEY (talent_id)
    REFERENCES talents(id)
    ON DELETE SET NULL
);
```

### API Endpoints

**Create Talent with User Account:**
```
POST /api/talents
Content-Type: application/json

{
  "name": "John Doe",
  "industry": "music",
  "profession": "DJ",
  "bio": "...",
  "tagline": "...",
  "image_src": "/images/talents/...",
  // ... other fields
}

Response (201):
{
  "talent": { /* talent object */ },
  "user": {
    "id": "uuid",
    "email": "john.doe@versatalent.com",
    "password": "H7k#9mP2$qR5",
    "role": "artist"
  },
  "message": "Talent profile and user account created successfully..."
}
```

### Error Handling

If user account creation fails (e.g., email already exists):

```json
{
  "talent": { /* talent object */ },
  "user": null,
  "warning": "Talent created but user account creation failed: Email already exists. You may need to create the user account manually."
}
```

The talent profile is still created, but no user account is generated.

## Migration Required

Before using this feature, run migration 007:

```sql
-- File: src/db/migrations/007_link_users_to_talents.sql
```

This migration:
- Changes `users.talent_id` from TEXT to UUID
- Adds foreign key constraint
- Adds unique constraint (one user per talent)
- Creates indexes for performance

## Troubleshooting

### Issue: Email Already Exists

**Problem**: Talent created but user account failed with "email already exists"

**Solution**:
1. Check if a user already exists with that email
2. Either:
   - Update the existing user's `talent_id` to link to the new talent
   - Change the talent's name slightly to generate a different email
   - Manually create user with a different email pattern

### Issue: Credentials Not Showing

**Problem**: Success message doesn't show email/password

**Solution**:
1. Check browser console for errors
2. Verify API response includes `user` object
3. Check database logs for user creation errors

### Issue: Talent Can't Login

**Problem**: Talent says credentials don't work

**Solution**:
1. Verify email is correct (check for typos)
2. Check if password was copied completely
3. Try resetting password manually in database
4. Verify user account exists and is linked to talent

## Security Considerations

### Password Storage

- Passwords are hashed using bcrypt (10 rounds)
- Only shown once in admin panel after creation
- Never stored in plaintext
- Cannot be retrieved from database

### Password Sharing

- Credentials should be shared securely
- Talents should change passwords after first login
- Consider implementing password reset functionality

### Access Control

- User accounts have `artist` role by default
- Cannot access admin panels
- Can only access talent-specific dashboard

## Future Enhancements

### Planned Features

- [ ] Email notifications with credentials
- [ ] Password reset via email
- [ ] Talent can change password from dashboard
- [ ] Two-factor authentication option
- [ ] Custom email domains per talent
- [ ] Bulk talent import with user creation

### Implementation Ideas

- Add "Resend Credentials" button in admin
- Show password strength indicator
- Allow admin to set custom email
- Add user activity logs
- Implement role-based permissions

## Related Documentation

- [Admin Talents Guide](./talent-management-guide.md)
- [Talents System README](../TALENTS_SYSTEM_README.md)
- [Admin Authentication Guide](../ADMIN_AUTH_GUIDE.md)
- [User Repository](../src/lib/db/repositories/users.ts)
- [Talent Repository](../src/lib/db/repositories/talents.ts)

---

**Last Updated**: December 3, 2025
**Migration**: 007_link_users_to_talents.sql
**Version**: 1.0.0
