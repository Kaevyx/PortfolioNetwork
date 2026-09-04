import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();
    const { user_id, category_id, priority_id, subject, description, custom_data, assigned_to, created_by_admin } = body;

    // Determine the actual user_id (admin creating on behalf of user, or regular user)
    const ticketUserId = user_id || userId;

    if (!category_id || !priority_id || !subject?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // If admin is creating on behalf of user, verify admin status
    if (created_by_admin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('clerk_id', userId)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        );
      }
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: ticketUserId,
        category_id,
        priority_id,
        subject: subject.trim(),
        description: description.trim(),
        custom_data: custom_data || null,
        assigned_to: assigned_to || null,
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    // Get all admins
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('clerk_id')
      .eq('is_admin', true);

    if (!adminsError && admins && admins.length > 0) {
      // Create notifications for all admins (except if admin created it and assigned to someone)
      const adminIdsToNotify = assigned_to 
        ? admins.filter(admin => admin.clerk_id !== assigned_to).map(admin => admin.clerk_id)
        : admins.map(admin => admin.clerk_id);

      if (adminIdsToNotify.length > 0) {
        const notifications = adminIdsToNotify.map(adminId => ({
          user_id: adminId,
          type: 'ticket_created',
          actor_id: created_by_admin || ticketUserId,
          target_id: ticket.id,
          message: created_by_admin 
            ? `New support ticket created on behalf of user: ${subject.trim()}`
            : `New support ticket: ${subject.trim()}`,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // If assigned to someone, notify that admin
      if (assigned_to) {
        await supabase.from('notifications').insert({
          user_id: assigned_to,
          type: 'ticket_assigned',
          actor_id: userId,
          target_id: ticket.id,
          message: `Ticket ${ticket.ticket_number} has been assigned to you`,
        });
      }
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create ticket" },
      { status: 500 }
    );
  }
}

