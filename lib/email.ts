import { Resend } from 'resend';
import { Signal, Competitor } from './types';
import { format } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);

interface DigestData {
  competitor: Competitor;
  signals: Signal[];
}

export async function sendDigestEmail(
  userEmail: string,
  digestData: DigestData[]
): Promise<boolean> {
  try {
    const totalSignals = digestData.reduce((sum, d) => sum + d.signals.length, 0);

    if (totalSignals === 0) {
      console.log('No signals to send in digest');
      return true;
    }

    const htmlContent = generateDigestHTML(digestData);

    await resend.emails.send({
      from: 'Competitor Intel <noreply@yourdomain.com>', // Update with your verified domain
      to: userEmail,
      subject: `Competitor Intelligence Digest - ${totalSignals} New Signal${totalSignals > 1 ? 's' : ''}`,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error('Error sending digest email:', error);
    return false;
  }
}

function generateDigestHTML(digestData: DigestData[]): string {
  const now = new Date();
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    h1 {
      color: #667eea;
      margin: 0 0 10px 0;
    }
    .date {
      color: #666;
      font-size: 14px;
    }
    .competitor-section {
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
    }
    .competitor-name {
      color: #667eea;
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 15px 0;
    }
    .signal {
      margin-bottom: 15px;
      padding: 15px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .signal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .signal-title {
      font-weight: 600;
      color: #333;
      margin: 0;
    }
    .signal-badges {
      display: flex;
      gap: 6px;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-positive { background: #d4edda; color: #155724; }
    .badge-negative { background: #f8d7da; color: #721c24; }
    .badge-neutral { background: #e2e3e5; color: #383d41; }
    .badge-priority { background: #fff3cd; color: #856404; }
    .signal-type {
      font-size: 12px;
      color: #667eea;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .signal-summary {
      color: #555;
      margin: 10px 0;
      font-size: 14px;
    }
    .signal-link {
      color: #667eea;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }
    .signal-link:hover {
      text-decoration: underline;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Competitor Intelligence Digest</h1>
      <div class="date">${format(now, 'EEEE, MMMM d, yyyy')}</div>
    </div>
`;

  digestData.forEach(({ competitor, signals }) => {
    if (signals.length === 0) return;

    html += `
    <div class="competitor-section">
      <h2 class="competitor-name">${competitor.name}</h2>
`;

    signals.forEach((signal) => {
      const sentimentBadge = signal.sentiment
        ? `<span class="badge badge-${signal.sentiment}">${signal.sentiment}</span>`
        : '';
      const priorityBadge = signal.is_high_priority
        ? '<span class="badge badge-priority">High Priority</span>'
        : '';

      html += `
      <div class="signal">
        <div class="signal-header">
          <h3 class="signal-title">${signal.title}</h3>
          <div class="signal-badges">
            ${sentimentBadge}
            ${priorityBadge}
          </div>
        </div>
        <div class="signal-type">${signal.signal_type.replace(/_/g, ' ')}</div>
        <div class="signal-summary">${signal.summary}</div>
        <a href="${signal.source_url}" class="signal-link" target="_blank">Read full article →</a>
      </div>
`;
    });

    html += `
    </div>
`;
  });

  html += `
    <div class="footer">
      <p>This is an automated digest from your Competitor Intelligence system.</p>
      <p>Log in to your dashboard to manage preferences and view all signals.</p>
    </div>
  </div>
</body>
</html>
`;

  return html;
}
