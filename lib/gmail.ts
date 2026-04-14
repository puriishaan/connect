import { google } from "googleapis";
import { prisma } from "./prisma";

export async function getGmailClient(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + "/api/auth/callback/google"
  );

  // Refresh token if expired or about to expire (within 5 min)
  const isExpired =
    !user.tokenExpiry ||
    user.tokenExpiry.getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired && user.refreshToken) {
    oauth2Client.setCredentials({ refresh_token: user.refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: credentials.access_token,
        tokenExpiry: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
      },
    });
    oauth2Client.setCredentials(credentials);
  } else {
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
    });
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
}
