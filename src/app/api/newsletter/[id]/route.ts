import { NextRequest, NextResponse } from 'next/server';
import {
  getSubscriberById,
  updateSubscriber,
  deleteSubscriber,
} from '@/lib/db/repositories/newsletter';
import type { UpdateNewsletterSubscriberRequest } from '@/lib/db/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const subscriber = await getSubscriberById(id);

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(subscriber);
  } catch (error) {
    console.error('Error fetching subscriber:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriber' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const data: UpdateNewsletterSubscriberRequest = await request.json();

    const subscriber = await updateSubscriber(id, data);

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(subscriber);
  } catch (error) {
    console.error('Error updating subscriber:', error);
    return NextResponse.json(
      { error: 'Failed to update subscriber' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = await deleteSubscriber(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscriber' },
      { status: 500 }
    );
  }
}
