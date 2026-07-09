import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const { reference, order_id } = await req.json();

    if (!reference || !order_id) {
      return new Response(JSON.stringify({ error: "Missing reference or order_id" }), { status: 400, headers: corsHeaders });
    }

    // 1. Verify user session
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // 2. Fetch order (with items) to verify it belongs to the user and is pending
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
    }

    if (order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: "Order is not pending" }), { status: 400, headers: corsHeaders });
    }

    // 3. Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return new Response(JSON.stringify({ error: "Payment verification failed" }), { status: 400, headers: corsHeaders });
    }

    // Paystack amount is in kobo. Order total is in Naira.
    const expectedAmountKobo = order.total * 100;
    if (paystackData.data.amount < expectedAmountKobo) {
      return new Response(JSON.stringify({ error: "Payment amount mismatch" }), { status: 400, headers: corsHeaders });
    }

    // 4. Update order status
    const { error: updateError } = await admin
      .from('orders')
      .update({
        status: 'confirmed',
        paystack_verified: true,
        paystack_reference: reference
      })
      .eq('id', order_id);

    if (updateError) {
      console.error("Order update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update order" }), { status: 500, headers: corsHeaders });
    }

    // Phase 9: Send order confirmation email using Resend
    if (RESEND_API_KEY) {
      try {
        const itemsHtml = (order.order_items || []).map((item: any) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <strong>${item.name || 'Custom Cake'}</strong> (x${item.quantity})<br>
              <small style="color: #666;">${item.description || ''}</small>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
              ₦${(item.unit_price * item.quantity).toLocaleString()}
            </td>
          </tr>
        `).join('');

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background-color: #3D1D16; padding: 20px; text-align: center;">
              <h1 style="color: #fff; margin: 0;">Flavors Sweet Slice</h1>
            </div>
            <div style="padding: 20px; background-color: #FDF9F3;">
              <h2 style="color: #3D1D16; margin-top: 0;">Order Confirmed!</h2>
              <p>Hi ${user.user_metadata?.first_name || 'there'},</p>
              <p>Thank you for your order! Your payment of <strong>₦${order.total.toLocaleString()}</strong> has been successfully verified.</p>
              
              <div style="background-color: #fff; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #eee;">
                <h3 style="margin-top: 0; color: #3D1D16;">Order Summary (ID: ${order_id.substring(0,8)})</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${itemsHtml}
                  <tr>
                    <td style="padding: 12px; text-align: right;"><strong>Subtotal:</strong></td>
                    <td style="padding: 12px; text-align: right;">₦${order.subtotal.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; text-align: right;"><strong>Delivery:</strong></td>
                    <td style="padding: 12px; text-align: right;">₦${order.delivery_fee.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; text-align: right;"><strong>Tax:</strong></td>
                    <td style="padding: 12px; text-align: right;">₦${order.tax.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-top: 2px solid #3D1D16; text-align: right;"><strong>Total:</strong></td>
                    <td style="padding: 12px; border-top: 2px solid #3D1D16; text-align: right;"><strong>₦${order.total.toLocaleString()}</strong></td>
                  </tr>
                </table>
              </div>
              
              <p><strong>Delivery Address:</strong><br>${order.delivery_address || 'N/A'}</p>
              <p>We're preparing your sweet slice. You can track your order status in your dashboard.</p>
              <p style="margin-top: 30px;">Warm regards,<br>The Flavors Sweet Slice Team</p>
            </div>
          </div>
        `;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'orders@flavorssweetslice.com', // Replace with verified domain if available, or onboarding@resend.dev for testing
            to: [user.email],
            subject: `Order Confirmation - Flavors Sweet Slice (${order_id.substring(0,8)})`,
            html: emailHtml
          })
        });
      } catch (emailErr) {
        console.error("Failed to send email via Resend:", emailErr);
        // Don't fail the payment verification if email fails
      }
    } else {
      console.warn("RESEND_API_KEY is not set. Skipping email notification.");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("verify-payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
