import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSubscribers,
  createSubscriber,
  getSubscriberCount,
  exportActiveSubscribers,
} from '@/lib/db/repositories/newsletter';
import type { CreateNewsletterSubscriberRequest } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    const countOnly = searchParams.get('countOnly') === 'true';
    const exportEmails = searchParams.get('export') === 'true';

    if (countOnly) {
      const count = await getSubscriberCount(activeOnly);
      return NextResponse.json({ count });
    }

    if (exportEmails) {
      const subscribers = await exportActiveSubscribers();
      return NextResponse.json(subscribers);
    }

    const subscribers = await getAllSubscribers({
      activeOnly,
      limit,
      offset,
    });

    return NextResponse.json(subscribers);
  } catch (error) {
    console.error('Error fetching newsletter subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter subscribers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateNewsletterSubscriberRequest = await request.json();

    // Validate required fields
    if (!data.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { subscriber, isNew } = await createSubscriber(data);

    return NextResponse.json(
      {
        success: true,
        subscriber,
        message: isNew
          ? 'Successfully subscribed to newsletter!'
          : 'Your subscription has been reactivated!',
      },
      { status: isNew ? 201 : 200 }
    );
  } catch (error: any) {
    console.error('Error subscribing to newsletter:', error);

    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}
