import { GithubReleaseResponseInterface } from '../../github/dto/github.response.dto';

export function getRepoUpdateTemplate(
  release: GithubReleaseResponseInterface,
  unsubscribeUrl: string,
) {
  return `
    <html>
      <body>
      <h2>New release in <b>${release.repo}</b></h2>
        <p>A new release has been published for the GitHub repository <b>${release.repo}</b>.</p>
        <p>The latest release tag is <b>${release.lastSeenTag}</b> ${
          release.publishedAt ? ` and it was published at ${release.publishedAt}` : ''
        }. You can view the release details <a href="${release.htmlUrl}">here</a>.</p>
        <p>Stay tuned for future updates.</p>
        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
          If you no longer wish to receive GItHub repository updates, you can 
          <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">unsubscribe here</a>.
        </p>
      </body>
    </html>
  `;
}
