/**
 * services/emailService.js — Email sending via Resend.
 *
 * Four template functions:
 *   sendWelcomeEmail(user)
 *   sendPromoEmail(user, discountCode, discountPercent)
 *   sendStreakReminderEmail(user, streakCount)
 *   sendFeatureAnnouncementEmail(users[], featureName, description)
 *
 * All emails are branded HTML in Vietnamese.
 * Fails silently (logs error, never throws) — email must not block auth flow.
 */

const escapeHtml = require("escape-html");

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@lingona.app";
const BRAND_COLOR = "#00A896";
const APP_URL = process.env.FRONTEND_URL || "https://lingona.app";

/**
 * Defensive coercion + HTML-escape for any user/admin-supplied value
 * that gets interpolated into an email body. Email clients are wildly
 * inconsistent about sandboxing — Outlook desktop renders inline
 * <script>, some Vietnamese ISPs proxy emails through preview engines
 * that execute JS. We escape at every interpolation boundary; the
 * brand color, fixed URLs, and template chrome are safe constants.
 *
 * Numbers are coerced to Number then String to drop any tagged input
 * without throwing on missing fields.
 *
 * @param {string|number|null|undefined} v
 * @returns {string}
 */
function safe(v) {
  if (v === null || v === undefined) return "";
  return escapeHtml(String(v));
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "";
}

// ─── Resend client (lazy init) ───────────────────────────────────────────────

let resendClient = null;

function getResend() {
  if (resendClient) return resendClient;
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — emails disabled.");
    return null;
  }
  const { Resend } = require("resend");
  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// ─── HTML wrapper ────────────────────────────────────────────────────────────

function wrapHtml(body) {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F7F4;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:24px;font-weight:700;color:#1A1A1A;">Lingona</span>
      <span style="font-size:12px;color:#999;display:block;margin-top:2px;">AI-powered IELTS coach</span>
    </div>
    <!-- Content -->
    <div style="background:#FFFFFF;border-radius:12px;padding:32px;border:1px solid #E8E8E4;">
      ${body}
    </div>
    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;font-size:11px;color:#999;">
      <p>&copy; ${new Date().getFullYear()} Lingona. All rights reserved.</p>
      <p style="margin-top:4px;"><a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">lingona.app</a></p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(text, href) {
  return `<a href="${href}" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;margin-top:16px;">${text}</a>`;
}

// ─── Template functions ──────────────────────────────────────────────────────

/**
 * Welcome email — sent on registration.
 */
async function sendWelcomeEmail(user) {
  const resend = getResend();
  if (!resend) return;

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">Chào ${safe(user.name)}! 👋</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Chào mừng bạn đến với <strong>Lingona</strong> — gia sư IELTS AI của bạn.
      Luyện Speaking, Writing và Grammar mọi lúc, mọi nơi.
    </p>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Bắt đầu ngay với buổi luyện Speaking đầu tiên — chỉ mất 5 phút!
    </p>
    ${ctaButton("Bắt đầu luyện IELTS →", `${APP_URL}/home`)}
  `);

  try {
    await resend.emails.send({
      from: `Lingona <${FROM_EMAIL}>`,
      to: user.email,
      subject: `Chào ${String(user.name || "").replace(/[\r\n<>]/g, "")}, chào mừng đến Lingona! 🎉`,
      html,
    });
    console.log(`[email] Welcome email sent to ${user.email}`);
  } catch (err) {
    console.error("[email] Failed to send welcome email:", err.message);
  }
}

/**
 * Promo email with discount code.
 */
async function sendPromoEmail(user, discountCode, discountPercent) {
  const resend = getResend();
  if (!resend) return;

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">🎉 ${safe(user.name)} ơi, quà dành cho bạn!</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Bạn nhận được <strong style="color:${BRAND_COLOR};font-size:18px;">${safeNumber(discountPercent)}% giảm giá</strong> cho gói Pro!
    </p>
    <div style="background:#F0FAFA;border:1px dashed ${BRAND_COLOR};border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
      <span style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Mã giảm giá</span>
      <div style="font-size:24px;font-weight:700;color:${BRAND_COLOR};margin-top:4px;letter-spacing:2px;">${safe(discountCode)}</div>
    </div>
    <p style="color:#999;font-size:12px;margin:0 0 16px;">⏰ Hết hạn sau 7 ngày. Không thể kết hợp với ưu đãi khác.</p>
    ${ctaButton("Nâng cấp Pro ngay →", `${APP_URL}/home`)}
  `);

  try {
    const safeName = String(user.name || "").replace(/[\r\n<>]/g, "");
    const safePct = safeNumber(discountPercent);
    await resend.emails.send({
      from: `Lingona <${FROM_EMAIL}>`,
      to: user.email,
      subject: `🎉 ${safeName} ơi, bạn nhận được ${safePct}% discount!`,
      html,
    });
    console.log(`[email] Promo email sent to ${user.email}`);
  } catch (err) {
    console.error("[email] Failed to send promo email:", err.message);
  }
}

/**
 * Streak reminder — daily nudge when streak is at risk.
 */
async function sendStreakReminderEmail(user, streakCount) {
  const resend = getResend();
  if (!resend) return;

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">🔥 Streak ${safeNumber(streakCount)} ngày sắp mất!</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      ${safe(user.name)} ơi, bạn chưa luyện hôm nay.
      Đừng để chuỗi <strong>${safeNumber(streakCount)} ngày</strong> bị phá vỡ!
    </p>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Chỉ cần 1 buổi luyện Speaking ngắn — 5 phút là đủ để giữ streak.
    </p>
    ${ctaButton("Luyện ngay để giữ streak 🔥", `${APP_URL}/home`)}
  `);

  try {
    const safeName = String(user.name || "").replace(/[\r\n<>]/g, "");
    const safeStreak = safeNumber(streakCount);
    await resend.emails.send({
      from: `Lingona <${FROM_EMAIL}>`,
      to: user.email,
      subject: `🔥 ${safeName}, streak ${safeStreak} ngày của bạn sắp mất!`,
      html,
    });
    console.log(`[email] Streak reminder sent to ${user.email}`);
  } catch (err) {
    console.error("[email] Failed to send streak reminder:", err.message);
  }
}

/**
 * Feature announcement — bulk send to multiple users.
 */
async function sendFeatureAnnouncementEmail(users, featureName, description) {
  const resend = getResend();
  if (!resend) return;

  // Hoist invariant escapes — admin-supplied strings only need escaping
  // once for the whole batch.
  const safeFeature = safe(featureName);
  const safeDesc = safe(description);
  const safeFeatureSubj = String(featureName || "").replace(/[\r\n<>]/g, "");

  let sent = 0;
  for (const user of users) {
    const html = wrapHtml(`
      <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">✨ Tính năng mới: ${safeFeature}</h2>
      <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${safe(user.name)} ơi, Lingona vừa ra mắt tính năng mới:
        <strong>${safeDesc}</strong>
      </p>
      ${ctaButton("Thử ngay →", `${APP_URL}/home`)}
    `);

    try {
      await resend.emails.send({
        from: `Lingona <${FROM_EMAIL}>`,
        to: user.email,
        subject: `✨ Tính năng mới: ${safeFeatureSubj}`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`[email] Feature email failed for ${user.email}:`, err.message);
    }

    // Rate limit: 100ms between sends to avoid Resend throttle
    if (users.length > 1) await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`[email] Feature announcement sent to ${sent}/${users.length} users`);
}

/**
 * Account-deletion confirmation email (Wave 2.7, PDPL VN).
 *
 * Sent AFTER the soft-delete transaction commits. Mirrors the FE modal
 * copy so the user has a written record of what was deleted vs anonymized.
 *
 * IMPORTANT: pass the user's plaintext email + name BEFORE anonymizing
 * the row. After anonymization the columns are NULL and we cannot
 * recover the address.
 *
 * @param {{ email: string, name: string|null }} user — plaintext snapshot taken pre-delete
 */
async function sendAccountDeletedEmail(user) {
  const resend = getResend();
  if (!resend || !user?.email) return;

  const deletedAt = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">Tài khoản Lingona đã được xóa</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Xin chào ${safe(user.name) || "bạn"},
    </p>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Yêu cầu xóa tài khoản của bạn đã được xử lý lúc <strong>${safe(deletedAt)}</strong> (giờ Việt Nam).
      Hành động này không thể hoàn tác.
    </p>

    <div style="background:#FFF7E6;border-left:3px solid #F59E0B;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <strong style="color:#1A1A1A;font-size:14px;">Đã xóa hoàn toàn:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;color:#666;font-size:13px;line-height:1.6;">
        <li>Tin nhắn với bạn bè</li>
        <li>Voice notes</li>
        <li>Lời mời kết bạn</li>
        <li>Avatar và bio</li>
        <li>Phiên đăng nhập (đã thoát mọi thiết bị)</li>
      </ul>
    </div>

    <div style="background:#F0FAFA;border-left:3px solid ${BRAND_COLOR};padding:12px 16px;margin:16px 0;border-radius:4px;">
      <strong style="color:#1A1A1A;font-size:14px;">Đã ẩn danh (giữ aggregate):</strong>
      <ul style="margin:8px 0 0;padding-left:20px;color:#666;font-size:13px;line-height:1.6;">
        <li>Điểm Battle (lịch sử trận đối thủ vẫn thấy)</li>
        <li>XP và rank trên leaderboard</li>
        <li>Badge đã đạt</li>
      </ul>
    </div>

    <p style="color:#999;font-size:12px;line-height:1.6;margin:24px 0 0;">
      Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, dữ liệu đã được
      ẩn danh sẽ không thể liên kết ngược lại với bạn.
    </p>
    <p style="color:#999;font-size:12px;line-height:1.6;margin:8px 0 0;">
      Email này gửi tự động, không trả lời.
    </p>
  `);

  try {
    await resend.emails.send({
      from: `Lingona <${FROM_EMAIL}>`,
      to: user.email,
      subject: "Tài khoản Lingona đã được xóa",
      html,
    });
    console.log(`[email] Account-deletion confirmation sent to ${user.email}`);
  } catch (err) {
    console.error("[email] Failed to send account-deletion confirmation:", err.message);
  }
}

/**
 * Helper — redact an email like `alice@gmail.com` to `a****@g****.com`.
 * Used in change/undo notifications so we can show the user WHICH
 * address the change targeted without printing it in full (defense
 * in depth — log lines, mailbox previews, screenshots).
 */
function redactEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  const maskLocal  = (local.length > 0 ? local[0] : "") + "****";
  const dotIdx = domain.lastIndexOf(".");
  const tld = dotIdx >= 0 ? domain.slice(dotIdx) : "";
  const maskDomain = (domain.length > 0 ? domain[0] : "") + "****";
  return `${maskLocal}@${maskDomain}${tld}`;
}

/**
 * Email-change notification (Wave 2.10).
 *
 * Sent to the OLD email immediately after the change commits. Includes
 * a 7-day undo link signed with config.jwt.accessSecret. The undo
 * token's jti is stored in email_changes.undo_token_jti so single-use
 * is enforced even if the link leaks.
 *
 * IMPORTANT: pass plaintext old_email + name BEFORE any anonymization
 * pipeline runs.
 *
 * @param {{ email: string, name: string|null }} user — snapshot of OLD address
 * @param {string} newEmail
 * @param {string} undoUrl — absolute URL with ?token=...
 */
async function sendEmailChangeNotification(user, newEmail, undoUrl) {
  const resend = getResend();
  if (!resend || !user?.email) return;

  const ts = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const masked = redactEmail(newEmail);

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">Email tài khoản Lingona đã được đổi</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Xin chào ${safe(user.name) || "bạn"},
    </p>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Email tài khoản Lingona vừa được đổi sang <strong>${safe(masked)}</strong>.
    </p>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      <strong>Thời gian:</strong> ${safe(ts)} (giờ Việt Nam)
    </p>

    <div style="background:#FFF7E6;border-left:3px solid #F59E0B;padding:14px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0 0 8px;color:#1A1A1A;font-size:14px;font-weight:600;">
        NẾU KHÔNG PHẢI BẠN
      </p>
      <p style="margin:0 0 12px;color:#666;font-size:13px;line-height:1.6;">
        Click link dưới đây trong <strong>7 ngày</strong> để khôi phục
        email cũ và thoát toàn bộ phiên đăng nhập:
      </p>
      ${ctaButton("Hủy đổi và khôi phục", undoUrl)}
      <p style="margin:12px 0 0;color:#999;font-size:11px;word-break:break-all;">
        Hoặc copy link: ${safe(undoUrl)}
      </p>
    </div>

    <p style="color:#999;font-size:12px;line-height:1.6;margin:24px 0 0;">
      Sau 7 ngày link sẽ hết hạn và không thể khôi phục từ email này.
      Nếu cần hỗ trợ, vui lòng liên hệ support@lingona.app.
    </p>
    <p style="color:#999;font-size:12px;line-height:1.6;margin:8px 0 0;">
      Email này gửi tự động, không trả lời.
    </p>
  `);

  try {
    await resend.emails.send({
      from: `Lingona <${FROM_EMAIL}>`,
      to: user.email,
      subject: "Email tài khoản Lingona đã được đổi",
      html,
    });
    console.log(`[email] Email-change notification sent to OLD address (redacted: ${redactEmail(user.email)})`);
  } catch (err) {
    console.error("[email] Failed to send email-change notification:", err.message);
  }
}

/**
 * Email-undo confirmation (Wave 2.10).
 *
 * Sent to the OLD email AFTER the undo flow successfully reverts the
 * change. Notifies the user the email is back and prompts them to
 * reset their password (every session was revoked).
 *
 * @param {{ email: string, name: string|null }} user — restored OLD email
 */
async function sendEmailUndoConfirmation(user) {
  const resend = getResend();
  if (!resend || !user?.email) return;

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">Đã khôi phục email tài khoản</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Xin chào ${safe(user.name) || "bạn"},
    </p>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Yêu cầu hủy đổi email đã thành công. Tài khoản Lingona của bạn
      bây giờ đăng nhập bằng email này.
    </p>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Vì lý do bảo mật, mọi phiên đăng nhập đã bị thoát. Vui lòng
      đăng nhập lại — và nếu nghi ngờ tài khoản bị truy cập trái phép,
      đổi mật khẩu ngay sau khi vào.
    </p>
    ${ctaButton("Đăng nhập lại", `${APP_URL}/login`)}
    <p style="color:#999;font-size:12px;line-height:1.6;margin:24px 0 0;">
      Email này gửi tự động, không trả lời.
    </p>
  `);

  try {
    await resend.emails.send({
      from: `Lingona <${FROM_EMAIL}>`,
      to: user.email,
      subject: "Email Lingona đã được khôi phục",
      html,
    });
    console.log(`[email] Email-undo confirmation sent (redacted: ${redactEmail(user.email)})`);
  } catch (err) {
    console.error("[email] Failed to send email-undo confirmation:", err.message);
  }
}

module.exports = {
  sendWelcomeEmail,
  sendPromoEmail,
  sendStreakReminderEmail,
  sendFeatureAnnouncementEmail,
  sendAccountDeletedEmail,
  sendEmailChangeNotification,
  sendEmailUndoConfirmation,
  // exposed for unit test of redactor
  __test: { redactEmail },
};
