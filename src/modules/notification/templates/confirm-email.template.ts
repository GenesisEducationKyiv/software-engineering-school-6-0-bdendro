export function getConfirmEmailTemplate(confirmationUrl: string, repo: string) {
  return `
    <html>
      <body>
        <h2>Confirm your email</h2>
        <p>You requested a subscription to updates for the GitHub repository <b>${repo}</b>.</p>
        <p>Click the button below to confirm your email address and activate the subscription.</p>
        <a href="${confirmationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none;">Confirm Email</a>
        <p>If you did not request this subscription, you can safely ignore this email.</p>
      </body>
    </html>
  `;
}
