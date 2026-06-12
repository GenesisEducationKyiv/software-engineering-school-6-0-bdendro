export function getUnsubscribeSuccessTemplate(repo: string) {
  return `
    <html>
      <body>
        <h2>You have unsubscribed</h2>
        <p>You have successfully unsubscribed from updates for the GitHub repository <b>${repo}</b>.</p>
        <p>You will no longer receive email notifications for new releases from this repository.</p>
      </body>
    </html>
  `;
}
