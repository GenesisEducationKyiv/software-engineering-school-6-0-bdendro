export function getConfirmationSuccessTemplate(unsubscribeUrl: string, repo: string) {
  return `
    <html>
      <body>
        <h2>Email confirmed!</h2>
        <p>Thank you for confirming your email. You will now receive updates for the GitHub repository <b>${repo}</b>.</p>
        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
          If you no longer wish to receive GitHub repository updates, you can 
          <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">unsubscribe here</a>.
        </p>
      </body>
    </html>
  `;
}
