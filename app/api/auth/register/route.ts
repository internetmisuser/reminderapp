import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB, isMongoConfigured } from '@/lib/mongodb';
import { User } from '@/models/User';
import { memoryStore, generateObjectIdHex, seedDefaultTasksForUser } from '@/lib/fallback-store';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (isMongoConfigured) {
      await connectDB();

      const existingUser = await User.findOne({ email }).select('+passwordHash');
      if (existingUser) {
        return NextResponse.json(
          {
            error: existingUser.passwordHash
              ? 'An account with this email already exists. Please sign in.'
              : 'This email is already linked to a social login provider.'
          },
          { status: 409 }
        );
      }

      const user = await User.create({
        name,
        email,
        passwordHash,
        provider: 'credentials',
      });

      return NextResponse.json(
        {
          user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
          },
        },
        { status: 201 }
      );
    }

    // Fallback in-memory registration when MONGODB_URI is not configured
    if (memoryStore.users.has(email)) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }

    const newUserId = generateObjectIdHex();
    memoryStore.users.set(email, {
      _id: newUserId,
      name,
      email,
      passwordHash,
      provider: 'credentials',
      createdAt: new Date().toISOString(),
    });

    seedDefaultTasksForUser(newUserId);

    return NextResponse.json(
      {
        user: {
          id: newUserId,
          name,
          email,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[REGISTER_ERROR]', err);
    return NextResponse.json(
      { error: 'Unable to register user account.' },
      { status: 500 }
    );
  }
}
